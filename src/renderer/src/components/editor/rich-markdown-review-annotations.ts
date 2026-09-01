import type { Dispatch, SetStateAction } from 'react'
import type { Editor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import type { DiffComment } from '../../../../shared/diff-comment-types'
import type { RichMarkdownAnnotationHighlightRange } from './rich-markdown-annotation-highlight'
import type { RichMarkdownReviewNotePosition } from './rich-markdown-review-note-layout'
import { findRichMarkdownSelectedTextRanges } from './rich-markdown-review-text-ranges'
import { countRichMarkdownReviewMarkdownLines } from './rich-markdown-review-line-count'

export type RichMarkdownCommentBlock = {
  key: string
  startLine: number
  endLine: number
  from: number
  to: number
}

export type RichMarkdownComposerState = {
  lineNumber: number
  startLine?: number
}

export type RichMarkdownAnnotationTarget = RichMarkdownComposerState & {
  from: number
  to: number
  selectedText: string
  top: number
  left?: number
  buttonTop: number
  buttonLeft: number
}

function serializeRichMarkdownJson(editor: Editor, content: JSONContent[]): string {
  return (editor.markdown?.serialize({ type: 'doc', content }) ?? '').trimEnd()
}

export function buildRichMarkdownCommentBlocks(editor: Editor): RichMarkdownCommentBlock[] {
  const jsonContent = editor.getJSON().content ?? []
  const blocks: RichMarkdownCommentBlock[] = []
  let nextLine = 1
  let previousNodeJson: JSONContent | null = null
  let previousNodeLineCount = 0

  editor.state.doc.forEach((node, nodeOffset, index) => {
    const nodeJson = jsonContent[index]
    if (!nodeJson) {
      return
    }
    const nodeMarkdown = serializeRichMarkdownJson(editor, [nodeJson])
    const nodeLineCount = countRichMarkdownReviewMarkdownLines(nodeMarkdown)
    if (previousNodeJson) {
      const pairMarkdown = serializeRichMarkdownJson(editor, [previousNodeJson, nodeJson])
      const separatorLineCount = Math.max(
        0,
        countRichMarkdownReviewMarkdownLines(pairMarkdown) - previousNodeLineCount - nodeLineCount
      )
      nextLine += separatorLineCount
    }
    const startLine = nextLine
    const endLine = Math.max(startLine, startLine + nodeLineCount - 1)
    const from = nodeOffset + 1
    blocks.push({
      key: `${index}:${startLine}-${endLine}`,
      startLine,
      endLine,
      from,
      to: from + Math.max(0, node.nodeSize - 1)
    })
    nextLine = endLine + 1
    previousNodeJson = nodeJson
    previousNodeLineCount = nodeLineCount
  })

  if (blocks.length === 0) {
    blocks.push({ key: 'empty:1-1', startLine: 1, endLine: 1, from: 1, to: 1 })
  }

  return blocks
}

export function clampRichMarkdownAnnotationTarget(
  editor: Editor,
  target: RichMarkdownAnnotationTarget
): RichMarkdownAnnotationTarget | null {
  const maxPos = Math.max(1, editor.state.doc.content.size)
  const from = Math.max(1, Math.min(target.from, maxPos))
  const to = Math.max(1, Math.min(target.to, maxPos))
  const clampedFrom = Math.min(from, to)
  const clampedTo = Math.max(from, to)
  if (clampedFrom === clampedTo) {
    return null
  }
  return { ...target, from: clampedFrom, to: clampedTo }
}

export function clearRichMarkdownNotePositions(
  setNotePositions: Dispatch<SetStateAction<RichMarkdownReviewNotePosition[]>>
): void {
  setNotePositions((current) => (current.length === 0 ? current : []))
}

export function getRichMarkdownAnnotationHighlightRanges(
  editor: Editor,
  comments: readonly DiffComment[],
  markdownSourceLineOffset: number
): RichMarkdownAnnotationHighlightRange[] {
  if (comments.length === 0) {
    return []
  }
  // Why once: block resolution re-serializes the doc; per comment it was O(n*doc).
  const blocks = buildRichMarkdownCommentBlocks(editor)
  return comments.flatMap((comment) =>
    getRichMarkdownAnnotationHighlightRangesForComment(
      editor,
      comment,
      markdownSourceLineOffset,
      blocks
    )
  )
}

export function getRichMarkdownAnnotationHighlightRangesForComment(
  editor: Editor,
  comment: DiffComment,
  markdownSourceLineOffset: number,
  // Why optional: callers looping over comments pass one shared build.
  prebuiltBlocks?: RichMarkdownCommentBlock[]
): RichMarkdownAnnotationHighlightRange[] {
  const blocks = prebuiltBlocks ?? buildRichMarkdownCommentBlocks(editor)
  const selectedText = comment.selectedText?.trim()
  if (!selectedText) {
    return []
  }
  const bodyLineNumber = Math.max(1, comment.lineNumber - markdownSourceLineOffset)
  const block = blocks.find(
    (candidate) => candidate.startLine <= bodyLineNumber && bodyLineNumber <= candidate.endLine
  )
  if (block) {
    const blockRanges = findRichMarkdownSelectedTextRanges({
      editor,
      selectedText,
      from: block.from,
      to: block.to
    })
    if (blockRanges.length > 0) {
      return blockRanges
    }
  }
  return findRichMarkdownSelectedTextRanges({ editor, selectedText })
}

export function getRichMarkdownCommentAtPos(
  editor: Editor,
  comments: readonly DiffComment[],
  markdownSourceLineOffset: number,
  pos: number
): DiffComment | null {
  if (comments.length === 0) {
    return null
  }
  const blocks = buildRichMarkdownCommentBlocks(editor)
  return (
    comments.find((comment) =>
      getRichMarkdownAnnotationHighlightRangesForComment(
        editor,
        comment,
        markdownSourceLineOffset,
        blocks
      ).some((range) => range.from <= pos && pos <= range.to)
    ) ?? null
  )
}

export function hasRichMarkdownCommentForRange(
  comments: readonly DiffComment[],
  target: Pick<RichMarkdownAnnotationTarget, 'lineNumber' | 'selectedText' | 'startLine'>,
  markdownSourceLineOffset: number
): boolean {
  const startLine = (target.startLine ?? target.lineNumber) + markdownSourceLineOffset
  const endLine = target.lineNumber + markdownSourceLineOffset
  const selectedText = target.selectedText.trim()
  return comments.some((comment) => {
    const commentStartLine = comment.startLine ?? comment.lineNumber
    return (
      commentStartLine === startLine &&
      comment.lineNumber === endLine &&
      (comment.selectedText?.trim() ?? '') === selectedText
    )
  })
}
