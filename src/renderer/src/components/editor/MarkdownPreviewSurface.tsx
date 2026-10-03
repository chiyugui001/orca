import { Loader2 } from 'lucide-react'
import { useMemo, type RefObject } from 'react'
import { extractFrontMatter, markdownFrontMatterInner } from './markdown-frontmatter'
import {
  VirtualMarkdownPreviewBody,
  type VirtualMarkdownPreviewNavigation
} from './VirtualMarkdownPreviewBody'
import type { useMarkdownPreviewDocument } from './use-markdown-preview-document'
import type { useMarkdownPreviewDocumentSearch } from './use-markdown-preview-document-search'
import type { Components } from 'react-markdown'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { MarkdownTableOfContentsPanel } from './MarkdownTableOfContentsPanel'
import { MarkdownPreviewAnnotationComposerLayer } from './MarkdownPreviewAnnotationComposerLayer'
import { MarkdownPreviewBody } from './MarkdownPreviewBody'
import { MarkdownPreviewReviewNoteLayer } from './MarkdownPreviewReviewNoteLayer'
import { MarkdownPreviewSearchBar } from './MarkdownPreviewSearchBar'
import type { MarkdownPreviewFoundation } from './use-markdown-preview-foundation'
import type { MarkdownPreviewReviewActions } from './use-markdown-preview-review-actions'
import { useMarkdownPreviewReviewRail } from './useMarkdownPreviewReviewRail'
import type { MarkdownPreviewViewport } from './use-markdown-preview-viewport'

export function MarkdownPreviewSurface({
  largePreview,
  documentState,
  documentSearch,
  largeNavigationRef,
  scrollCacheKey,
  foundation,
  viewport,
  reviewActions,
  components,
  // Why: upstream threads filePath to a review toolbar this fork doesn't render; keep the prop for merge parity.
  filePath: _filePath,
  showTableOfContents,
  onCloseTableOfContents
}: {
  largePreview: boolean
  documentState: ReturnType<typeof useMarkdownPreviewDocument>
  documentSearch: ReturnType<typeof useMarkdownPreviewDocumentSearch>
  largeNavigationRef: RefObject<VirtualMarkdownPreviewNavigation | null>
  scrollCacheKey: string
  foundation: MarkdownPreviewFoundation
  viewport: MarkdownPreviewViewport
  reviewActions: MarkdownPreviewReviewActions
  components: Components
  filePath: string
  showTableOfContents: boolean
  onCloseTableOfContents?: () => void
}): React.JSX.Element {
  const {
    isSearchOpen,
    tableOfContentsItems,
    editorFontSize,
    isDark,
    bodyRef,
    frontmatterVisible,
    renderedContent,
    markdownComments,
    sourceRelativePath,
    sourceWorktree,
    activeReviewCommentId,
    attentionReviewCommentId,
    copiedReviewNoteId
  } = foundation
  const deleteDiffComment = useAppStore((s) => s.deleteDiffComment)
  const updateDiffComment = useAppStore((s) => s.updateDiffComment)
  const markDiffCommentsSent = useAppStore((s) => s.markDiffCommentsSent)
  const { positions, requestSyncPositions } = useMarkdownPreviewReviewRail({ foundation })

  const displayedContent =
    documentState.status === 'ready' ? documentState.content : renderedContent
  const frontMatter = useMemo(() => extractFrontMatter(displayedContent), [displayedContent])
  const frontMatterInner = useMemo(() => markdownFrontMatterInner(frontMatter), [frontMatter])

  return (
    <div className="markdown-preview-shell">
      {showTableOfContents ? (
        <MarkdownTableOfContentsPanel
          virtualized={largePreview}
          items={
            largePreview
              ? documentState.status === 'ready'
                ? documentState.document.toc
                : []
              : tableOfContentsItems
          }
          onClose={onCloseTableOfContents ?? (() => {})}
          onNavigate={viewport.navigateToTableOfContentsItem}
        />
      ) : null}
      <div
        ref={viewport.setRootRef}
        tabIndex={0}
        style={{
          fontSize: `${editorFontSize}px`,
          overflowAnchor: largePreview ? 'none' : undefined
        }}
        className={`markdown-preview h-full min-h-0 overflow-auto scrollbar-editor ${
          markdownComments.length > 0 ? 'has-markdown-preview-review-notes' : ''
        } ${isDark ? 'markdown-dark' : 'markdown-light'}`}
      >
        {isSearchOpen ? (
          <MarkdownPreviewSearchBar
            searchFailed={documentSearch.failed}
            searchPending={documentSearch.pending}
            searchTruncated={documentSearch.truncated}
            foundation={foundation}
            viewport={viewport}
          />
        ) : null}
        {/* Why: OS page translation can replace react-owned text nodes and crash reconciliation. */}
        <div
          ref={bodyRef}
          className="markdown-body"
          translate="no"
          data-markdown-preview-incomplete={largePreview || undefined}
        >
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
          {largePreview ? (
            <>
              <p className="relative text-xs text-muted-foreground">
                {translate(
                  'editor.markdownPreview.largeNotice',
                  'Large preview. Use source view to copy the complete document. PDF export is unavailable.'
                )}
                {documentState.refreshing ? (
                  <span
                    role={documentState.refreshError ? 'alert' : 'status'}
                    className="absolute inset-0 bg-background"
                  >
                    {documentState.refreshError
                      ? translate(
                          'editor.markdownPreview.refreshFailed',
                          'Preview update failed. Showing the previous version; open source view for current content.'
                        )
                      : translate('editor.markdownPreview.preparing', 'Preparing preview…')}
                  </span>
                ) : null}
              </p>
              {documentState.status === 'ready' ? (
                <VirtualMarkdownPreviewBody
                  inert={documentState.refreshing}
                  revision={documentState.revision}
                  document={documentState.document}
                  client={documentState.client}
                  components={components}
                  rootRef={foundation.rootRef}
                  bodyRef={bodyRef}
                  navigationRef={largeNavigationRef}
                  query={foundation.query}
                  matches={documentSearch.matches}
                  activeMatchIndex={foundation.activeMatchIndex}
                  searchInstance={foundation.searchInstanceRef.current}
                  scrollCacheKey={scrollCacheKey}
                  activeAnnotationBlockKey={foundation.activeAnnotationBlockKey}
                />
              ) : documentState.status === 'error' ? (
                <p role="alert" className="text-sm text-muted-foreground">
                  {translate(
                    'editor.markdownPreview.processingFailed',
                    'This document cannot be rendered within the preview limits. Open source view to read the complete file.'
                  )}
                </p>
              ) : (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {translate('editor.markdownPreview.preparing', 'Preparing preview…')}
                </p>
              )}
            </>
          ) : (
            <MarkdownPreviewBody content={renderedContent} components={components} />
          )}
        </div>
        <MarkdownPreviewAnnotationComposerLayer foundation={foundation} />
        {sourceWorktree && sourceRelativePath !== null && positions.length > 0 ? (
          <MarkdownPreviewReviewNoteLayer
            positions={positions}
            activeCommentId={activeReviewCommentId}
            attentionCommentId={attentionReviewCommentId}
            copiedCommentId={copiedReviewNoteId}
            content={displayedContent}
            filePath={sourceRelativePath}
            worktreeId={sourceWorktree.id}
            onCopyNote={reviewActions.handleCopyMarkdownReviewNote}
            onDeleteComment={(commentId) => void deleteDiffComment(sourceWorktree.id, commentId)}
            onSubmitEdit={(commentId, body) => updateDiffComment(sourceWorktree.id, commentId, body)}
            onContentResize={requestSyncPositions}
            onDelivered={(notes) =>
              void markDiffCommentsSent(
                sourceWorktree.id,
                notes.map((note) => note.id)
              )
            }
          />
        ) : null}
      </div>
    </div>
  )
}
