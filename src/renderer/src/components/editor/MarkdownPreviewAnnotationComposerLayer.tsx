import { useLayoutEffect, useState } from 'react'
import { formatMarkdownReviewCardQuote } from '@/lib/markdown-review-notes'
import { MarkdownPreviewAnnotationComposer } from './MarkdownPreviewAnnotationComposer'
import type { MarkdownPreviewFoundation } from './use-markdown-preview-foundation'

type ComposerPosition = { top: number; lineNumber: number; startLine?: number; quote?: string }

export function MarkdownPreviewAnnotationComposerLayer({
  foundation
}: {
  foundation: MarkdownPreviewFoundation
}): React.JSX.Element | null {
  const {
    activeAnnotationBlockKey,
    addDiffComment,
    bodyRef,
    rootRef,
    setActiveAnnotationBlockKey,
    sourceRelativePath,
    sourceWorktree
  } = foundation
  const [position, setPosition] = useState<ComposerPosition | null>(null)

  useLayoutEffect(() => {
    if (!activeAnnotationBlockKey) {
      setPosition(null)
      return
    }
    const body = bodyRef.current
    const container = rootRef.current
    const block = body?.querySelector<HTMLElement>('[data-annotation-block-key]')
    if (!body || !container || !block) {
      return
    }
    const target = Array.from(body.querySelectorAll<HTMLElement>('[data-annotation-block-key]')).find(
      (candidate) => candidate.dataset.annotationBlockKey === activeAnnotationBlockKey
    )
    if (!target) {
      return
    }
    const startLine = Number(target.dataset.sourceLine)
    const lineNumber = Number(target.dataset.sourceEndLine)
    if (!Number.isInteger(startLine) || !Number.isInteger(lineNumber)) {
      return
    }
    const targetRect = target.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setPosition({
      top: targetRect.top - containerRect.top + container.scrollTop,
      lineNumber,
      startLine: startLine === lineNumber ? undefined : startLine,
      quote: formatMarkdownReviewCardQuote(target.textContent ?? '')
    })
  }, [activeAnnotationBlockKey, bodyRef, rootRef])

  if (!position || !sourceWorktree || sourceRelativePath === null) {
    return null
  }

  return (
    <div className="markdown-preview-annotation-composer-layer" style={{ top: position.top }}>
      <MarkdownPreviewAnnotationComposer
        lineNumber={position.lineNumber}
        startLine={position.startLine}
        filePath={sourceRelativePath}
        onCancel={() => setActiveAnnotationBlockKey(null)}
        onSubmit={async (body) => {
          const result = await addDiffComment({
            worktreeId: sourceWorktree.id,
            filePath: sourceRelativePath,
            source: 'markdown',
            startLine: position.startLine,
            lineNumber: position.lineNumber,
            ...(position.quote ? { selectedText: position.quote } : {}),
            body,
            side: 'modified'
          })
          if (result) {
            setActiveAnnotationBlockKey(null)
            return true
          }
          return false
        }}
      />
    </div>
  )
}
