import type { DiffComment } from '../../../../shared/diff-comment-types'
import {
  stackRichMarkdownReviewNotePositions,
  type RichMarkdownReviewNotePosition
} from './rich-markdown-review-note-layout'

export type MarkdownPreviewReviewNotePosition = RichMarkdownReviewNotePosition

export function measureMarkdownPreviewReviewNotePositions({
  body,
  comments,
  container
}: {
  body: HTMLElement
  comments: readonly DiffComment[]
  container: HTMLElement
}): MarkdownPreviewReviewNotePosition[] {
  const containerRect = container.getBoundingClientRect()
  const blocks = Array.from(
    body.querySelectorAll<HTMLElement>('[data-source-line][data-source-end-line]')
  )
  const positions = comments.flatMap((comment) => {
    const block = blocks.find((candidate) => {
      const startLine = Number(candidate.dataset.sourceLine)
      const endLine = Number(candidate.dataset.sourceEndLine)
      return startLine <= comment.lineNumber && comment.lineNumber <= endLine
    })
    if (!block) {
      return []
    }
    const blockRect = block.getBoundingClientRect()
    return [{ comment, top: blockRect.top - containerRect.top + container.scrollTop }]
  })

  return stackRichMarkdownReviewNotePositions(positions)
}
