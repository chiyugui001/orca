import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { measureMarkdownPreviewReviewNotePositions } from './markdown-preview-review-note-positioning'
import type { MarkdownPreviewFoundation } from './use-markdown-preview-foundation'

export function useMarkdownPreviewReviewRail({
  foundation
}: {
  foundation: MarkdownPreviewFoundation
}) {
  const { bodyRef, markdownComments, rootRef } = foundation
  const [positions, setPositions] = useState<ReturnType<
    typeof measureMarkdownPreviewReviewNotePositions
  >>([])
  const frameRef = useRef<number | null>(null)

  const syncPositions = useCallback((): void => {
    const body = bodyRef.current
    const container = rootRef.current
    if (!body || !container || markdownComments.length === 0) {
      setPositions((current) => (current.length === 0 ? current : []))
      return
    }
    setPositions(measureMarkdownPreviewReviewNotePositions({ body, comments: markdownComments, container }))
  }, [bodyRef, markdownComments, rootRef])

  const requestSyncPositions = useCallback((): void => {
    if (frameRef.current !== null) {
      return
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      syncPositions()
    })
  }, [syncPositions])

  useLayoutEffect(() => {
    requestSyncPositions()
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [requestSyncPositions])

  useEffect(() => {
    const container = rootRef.current
    if (!container) {
      return
    }
    container.addEventListener('scroll', requestSyncPositions, { passive: true })
    window.addEventListener('resize', requestSyncPositions)
    return () => {
      container.removeEventListener('scroll', requestSyncPositions)
      window.removeEventListener('resize', requestSyncPositions)
    }
  }, [requestSyncPositions, rootRef])

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) {
      return
    }
    for (const block of body.querySelectorAll<HTMLElement>('[data-source-line][data-source-end-line]')) {
      const startLine = Number(block.dataset.sourceLine)
      const endLine = Number(block.dataset.sourceEndLine)
      block.classList.toggle(
        'has-review-notes',
        markdownComments.some((comment) => startLine <= comment.lineNumber && comment.lineNumber <= endLine)
      )
    }
  }, [bodyRef, markdownComments])

  return { positions, requestSyncPositions }
}
