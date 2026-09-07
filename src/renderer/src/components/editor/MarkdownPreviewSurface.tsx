import type { Components } from 'react-markdown'
import { translate } from '@/i18n/i18n'
import { MarkdownTableOfContentsPanel } from './MarkdownTableOfContentsPanel'
import { MarkdownPreviewAnnotationComposerLayer } from './MarkdownPreviewAnnotationComposerLayer'
import { MarkdownPreviewBody } from './MarkdownPreviewBody'
import { MarkdownPreviewReviewNoteLayer } from './MarkdownPreviewReviewNoteLayer'
import { MarkdownPreviewSearchBar } from './MarkdownPreviewSearchBar'
import type { MarkdownPreviewReviewActions } from './use-markdown-preview-review-actions'
import type { MarkdownPreviewFoundation } from './use-markdown-preview-foundation'
import { useMarkdownPreviewReviewRail } from './useMarkdownPreviewReviewRail'
import type { MarkdownPreviewViewport } from './use-markdown-preview-viewport'

export function MarkdownPreviewSurface({
  foundation,
  viewport,
  components,
  reviewActions,
  showTableOfContents,
  onCloseTableOfContents
}: {
  foundation: MarkdownPreviewFoundation
  viewport: MarkdownPreviewViewport
  components: Components
  reviewActions: MarkdownPreviewReviewActions
  showTableOfContents: boolean
  onCloseTableOfContents?: () => void
}): React.JSX.Element {
  const {
    isSearchOpen,
    tableOfContentsItems,
    editorFontSize,
    isDark,
    bodyRef,
    frontMatter,
    frontmatterVisible,
    frontMatterInner,
    renderedContent,
    markdownComments,
    sourceRelativePath,
    sourceWorktree,
    activeReviewCommentId,
    attentionReviewCommentId,
    copiedReviewNoteId,
    deleteDiffComment,
    updateDiffComment,
    clearDeliveredDiffComments
  } = foundation
  const { positions, requestSyncPositions } = useMarkdownPreviewReviewRail({ foundation })

  return (
    <div className="markdown-preview-shell">
      {showTableOfContents ? (
        <MarkdownTableOfContentsPanel
          items={tableOfContentsItems}
          onClose={onCloseTableOfContents ?? (() => {})}
          onNavigate={viewport.navigateToTableOfContentsItem}
        />
      ) : null}
      <div
        ref={viewport.setRootRef}
        tabIndex={0}
        style={{ fontSize: `${editorFontSize}px` }}
        className={`markdown-preview h-full min-h-0 overflow-auto scrollbar-editor ${
          markdownComments.length > 0 ? 'has-markdown-preview-review-notes' : ''
        } ${isDark ? 'markdown-dark' : 'markdown-light'}`}
      >
        {isSearchOpen ? (
          <MarkdownPreviewSearchBar foundation={foundation} viewport={viewport} />
        ) : null}
        {/* Why: OS page translation can replace react-owned text nodes and crash reconciliation. */}
        <div ref={bodyRef} className="markdown-body" translate="no">
          {frontMatter && frontmatterVisible ? (
            <div className="mb-4 rounded border border-border/60 bg-muted/40 px-3 py-2">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {translate('auto.components.editor.MarkdownPreview.2b2b31382c', 'Front Matter')}
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground font-mono scrollbar-editor">
                {frontMatterInner}
              </pre>
            </div>
          ) : null}
          <MarkdownPreviewBody content={renderedContent} components={components} />
        </div>
        <MarkdownPreviewAnnotationComposerLayer foundation={foundation} />
        {sourceWorktree && sourceRelativePath !== null && positions.length > 0 ? (
          <MarkdownPreviewReviewNoteLayer
            positions={positions}
            activeCommentId={activeReviewCommentId}
            attentionCommentId={attentionReviewCommentId}
            copiedCommentId={copiedReviewNoteId}
            content={renderedContent}
            filePath={sourceRelativePath}
            worktreeId={sourceWorktree.id}
            onCopyNote={reviewActions.handleCopyMarkdownReviewNote}
            onDeleteComment={(commentId) => void deleteDiffComment(sourceWorktree.id, commentId)}
            onSubmitEdit={(commentId, body) => updateDiffComment(sourceWorktree.id, commentId, body)}
            onContentResize={requestSyncPositions}
            onDelivered={(notes) => void clearDeliveredDiffComments(sourceWorktree.id, notes)}
          />
        ) : null}
      </div>
    </div>
  )
}
