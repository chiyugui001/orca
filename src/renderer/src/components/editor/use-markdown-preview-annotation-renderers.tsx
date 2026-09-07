import { useCallback } from 'react'
import { Plus } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { getMarkdownPreviewBlockRange } from './markdown-preview-block-model'
import type { MarkdownPreviewPositionNode } from './markdown-preview-types'
import type { MarkdownPreviewFoundation } from './use-markdown-preview-foundation'
import type { MarkdownPreviewReviewActions } from './use-markdown-preview-review-actions'

export function useMarkdownPreviewAnnotationRenderers({
  foundation,
  reviewActions,
  markdownAnnotationsEnabled
}: {
  foundation: MarkdownPreviewFoundation
  reviewActions: MarkdownPreviewReviewActions
  markdownAnnotationsEnabled: boolean
}) {
  const {
    sourceWorktree,
    sourceRelativePath,
    setActiveAnnotationBlockKey
  } = foundation
  const { handleAnnotatedMarkdownBlockClick } = reviewActions

  const renderAnnotationControls = useCallback(
    (blockKey: string): React.ReactNode => {
      if (!sourceWorktree || sourceRelativePath === null) {
        return null
      }
      if (!markdownAnnotationsEnabled) {
        return null
      }
      return (
        <div className="markdown-annotation-controls">
          <button
            type="button"
            className="markdown-annotation-add"
            aria-label={translate('auto.components.editor.MarkdownPreview.13f94d760c', 'Add note')}
            title={translate('auto.components.editor.MarkdownPreview.13f94d760c', 'Add note')}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setActiveAnnotationBlockKey(blockKey)
            }}
          >
            <Plus className="size-3" />
          </button>
        </div>
      )
    },
    [
      markdownAnnotationsEnabled,
      setActiveAnnotationBlockKey,
      sourceRelativePath,
      sourceWorktree
    ]
  )

  const wrapAnnotatedBlock = useCallback(
    (
      tagName: string,
      node: MarkdownPreviewPositionNode | undefined,
      rendered: React.ReactNode
    ): React.ReactNode => {
      const range = getMarkdownPreviewBlockRange(node)
      if (!range) {
        return rendered
      }
      const blockKey = `${tagName}:${range.startLine}-${range.endLine}`
      const controls = renderAnnotationControls(blockKey)
      if (!controls) {
        return rendered
      }
      return (
        <div
          className="markdown-annotation-block"
          data-source-line={range.startLine}
          data-source-end-line={range.endLine}
          data-annotation-block-key={blockKey}
          onClick={(event) => handleAnnotatedMarkdownBlockClick(range, event)}
        >
          {rendered}
          {controls}
        </div>
      )
    },
    [handleAnnotatedMarkdownBlockClick, renderAnnotationControls]
  )

  return { renderAnnotationControls, wrapAnnotatedBlock }
}

export type MarkdownPreviewAnnotationRenderers = ReturnType<
  typeof useMarkdownPreviewAnnotationRenderers
>
