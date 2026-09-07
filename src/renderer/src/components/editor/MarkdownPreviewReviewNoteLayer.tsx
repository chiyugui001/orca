import { Check, Copy } from 'lucide-react'
import { getMarkdownReviewCardQuote, type MarkdownReviewNote } from '@/lib/markdown-review-notes'
import { DiffCommentCard } from '../diff-comments/DiffCommentCard'
import { MarkdownPreviewSingleNoteSendMenu } from './MarkdownPreviewAnnotationComposer'
import type { MarkdownPreviewReviewNotePosition } from './markdown-preview-review-note-positioning'

export function MarkdownPreviewReviewNoteLayer({
  positions,
  activeCommentId,
  attentionCommentId,
  copiedCommentId,
  content,
  filePath,
  worktreeId,
  onCopyNote,
  onDeleteComment,
  onSubmitEdit,
  onContentResize,
  onDelivered
}: {
  positions: readonly MarkdownPreviewReviewNotePosition[]
  activeCommentId: string | null
  attentionCommentId: string | null
  copiedCommentId: string | null
  content: string
  filePath: string
  worktreeId: string
  onCopyNote: (note: MarkdownReviewNote) => void
  onDeleteComment: (commentId: string) => void
  onSubmitEdit: (commentId: string, body: string) => Promise<boolean>
  onContentResize: () => void
  onDelivered: (notes: readonly MarkdownReviewNote[]) => void
}): React.JSX.Element {
  return (
    <div className="markdown-preview-review-note-layer" aria-label="Review notes">
      {positions.map(({ comment, top }) => (
        <div
          key={comment.id}
          data-markdown-review-note-id={comment.id}
          className={`markdown-preview-review-note-card markdown-annotation-card ${
            activeCommentId === comment.id ? 'is-active' : ''
          } ${attentionCommentId === comment.id ? 'is-attention' : ''}`.trim()}
          style={{ top }}
        >
          <DiffCommentCard
            lineNumber={comment.lineNumber}
            startLine={comment.startLine}
            label={null}
            quote={getMarkdownReviewCardQuote(content, comment)}
            body={comment.body}
            sentAt={comment.sentAt}
            onDelete={() => onDeleteComment(comment.id)}
            onSubmitEdit={(body) => onSubmitEdit(comment.id, body)}
            onContentResize={onContentResize}
            headerActions={
              <>
                <button
                  type="button"
                  className="orca-diff-comment-pill-btn"
                  aria-label="Copy note for agent"
                  title="Copy note for agent"
                  onClick={() => onCopyNote(comment as MarkdownReviewNote)}
                >
                  {copiedCommentId === comment.id ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                <MarkdownPreviewSingleNoteSendMenu
                  worktreeId={worktreeId}
                  filePath={filePath}
                  content={content}
                  note={comment as MarkdownReviewNote}
                  modeSlot="preview-rail"
                  onDelivered={onDelivered}
                />
              </>
            }
          />
        </div>
      ))}
    </div>
  )
}
