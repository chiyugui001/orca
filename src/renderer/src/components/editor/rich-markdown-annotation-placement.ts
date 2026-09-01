import type { Editor } from '@tiptap/react'
import {
  buildRichMarkdownCommentBlocks,
  getRichMarkdownAnnotationHighlightRangesForComment,
  type RichMarkdownAnnotationTarget,
  type RichMarkdownCommentBlock,
  type RichMarkdownComposerState
} from './rich-markdown-review-annotations'
import { getRichMarkdownLineRangeFromBlocks } from './rich-markdown-range-bounds'
import { getRichMarkdownRangeStart } from './rich-markdown-range-bounds'
import { getRichMarkdownSelectionVisibleText } from './rich-markdown-visible-text-map'
import type { DiffComment } from '../../../../shared/diff-comment-types'

const ANNOTATION_BUTTON_SIZE_PX = 24
const ANNOTATION_EDGE_PADDING_PX = 8
const ANNOTATION_SELECTION_GAP_PX = 8
const ANNOTATION_MIN_LEFT_PX = 56
const ANNOTATION_RIGHT_OFFSET_PX = 42
const ANNOTATION_POPOVER_WIDTH_PX = 420
const ANNOTATION_POPOVER_RIGHT_OFFSET_PX = 24
const ANNOTATION_POPOVER_MIN_HEIGHT_PX = 220

export function getRichMarkdownCommentAnchorTop(
  editor: Editor,
  comment: DiffComment,
  block: RichMarkdownCommentBlock,
  containerRect: DOMRect,
  containerScrollTop: number,
  markdownSourceLineOffset: number
): number | null {
  try {
    const ranges = getRichMarkdownAnnotationHighlightRangesForComment(
      editor,
      comment,
      markdownSourceLineOffset
    )
    // Range notes sort by the start of the selected text.
    const anchorPos = getRichMarkdownRangeStart(ranges) ?? block.from
    const coords = editor.view.coordsAtPos(
      Math.max(1, Math.min(anchorPos, editor.state.doc.content.size))
    )
    return coords.top - containerRect.top + containerScrollTop
  } catch {
    return null
  }
}

function getCodeBlockLine(editor: Editor, pos: number, baseStartLine: number): number {
  const resolved = editor.state.doc.resolve(pos)
  const precedingText = resolved.parent.textContent.slice(0, resolved.parentOffset)
  return baseStartLine + 1 + (precedingText.match(/\n/g) ?? []).length
}

function getRichMarkdownSelectionRange(editor: Editor): RichMarkdownComposerState {
  const blocks = buildRichMarkdownCommentBlocks(editor)
  const { from, to, empty } = editor.state.selection
  const selectedBlocks = empty
    ? blocks.filter((block) => block.from <= from && from <= block.to)
    : blocks.filter((block) => from <= block.to && to >= block.from)
  const targetBlocks = selectedBlocks.length > 0 ? selectedBlocks : [blocks[0]!]
  const baseRange = getRichMarkdownLineRangeFromBlocks(targetBlocks)
  if (
    !baseRange ||
    targetBlocks.length !== 1 ||
    editor.state.doc.resolve(from).parent.type.name !== 'codeBlock'
  ) {
    return baseRange ?? { lineNumber: 1 }
  }
  const baseStartLine = baseRange.startLine ?? baseRange.lineNumber
  const startLine = getCodeBlockLine(editor, from, baseStartLine)
  const endLine = getCodeBlockLine(editor, to, baseStartLine)
  if (from === to || startLine === endLine) {
    return { lineNumber: startLine }
  }
  return { startLine, lineNumber: endLine }
}

function getCurrentSelectionRect(root: HTMLElement): DOMRect | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) {
    return null
  }
  const rect = range.getBoundingClientRect()
  if (rect.width > 0 || rect.height > 0) {
    return rect
  }
  return Array.from(range.getClientRects()).find((candidate) => candidate.width > 0) ?? null
}

export function getRichMarkdownAnnotationButtonTop(
  selectionBottomInRoot: number,
  rootHeight: number
): number {
  const preferredTop = selectionBottomInRoot + ANNOTATION_SELECTION_GAP_PX
  const maxTop = Math.max(
    ANNOTATION_EDGE_PADDING_PX,
    rootHeight - ANNOTATION_BUTTON_SIZE_PX - ANNOTATION_EDGE_PADDING_PX
  )
  return Math.max(ANNOTATION_EDGE_PADDING_PX, Math.min(preferredTop, maxTop))
}

export function getRichMarkdownAnnotationButtonLeft(rootWidth: number): number {
  const preferredLeft = Math.max(ANNOTATION_MIN_LEFT_PX, rootWidth - ANNOTATION_RIGHT_OFFSET_PX)
  const maxLeft = Math.max(
    ANNOTATION_EDGE_PADDING_PX,
    rootWidth - ANNOTATION_BUTTON_SIZE_PX - ANNOTATION_EDGE_PADDING_PX
  )
  return Math.min(preferredLeft, maxLeft)
}

export function getRichMarkdownAnnotationTarget(
  editor: Editor,
  root: HTMLElement
): RichMarkdownAnnotationTarget | null {
  if (editor.state.selection.empty) {
    return null
  }
  const rect = getCurrentSelectionRect(root)
  if (!rect) {
    return null
  }
  const selectedText = getRichMarkdownSelectionVisibleText(editor.state)
  if (!selectedText) {
    return null
  }
  const rootRect = root.getBoundingClientRect()
  const buttonTop = getRichMarkdownAnnotationButtonTop(rect.bottom - rootRect.top, rootRect.height)
  const left = Math.max(
    ANNOTATION_MIN_LEFT_PX,
    rootRect.width - ANNOTATION_POPOVER_WIDTH_PX - ANNOTATION_POPOVER_RIGHT_OFFSET_PX
  )
  const popoverTop = Math.max(
    ANNOTATION_EDGE_PADDING_PX,
    Math.min(
      buttonTop + ANNOTATION_BUTTON_SIZE_PX + 6,
      rootRect.height - ANNOTATION_POPOVER_MIN_HEIGHT_PX
    )
  )
  return {
    ...getRichMarkdownSelectionRange(editor),
    from: editor.state.selection.from,
    to: editor.state.selection.to,
    selectedText,
    top: popoverTop,
    left,
    buttonTop,
    buttonLeft: getRichMarkdownAnnotationButtonLeft(rootRect.width)
  }
}
