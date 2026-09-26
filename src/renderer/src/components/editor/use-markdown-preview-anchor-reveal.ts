import { useCallback, useLayoutEffect } from 'react'
import {
  decodeMarkdownPreviewAnchor,
  getMarkdownPreviewAnchorScrollTop
} from './markdown-preview-anchor-navigation'
import type { MarkdownPreviewFoundation } from './use-markdown-preview-foundation'

const ANCHOR_REVEAL_RETRY_INTERVAL_MS = 50
const ANCHOR_REVEAL_MAX_ATTEMPTS = 60
const ANCHOR_LANDED_TOLERANCE_PX = 8
const ANCHOR_REASSERT_INTERVAL_MS = 100
const ANCHOR_REASSERT_TICKS = 40
const ANCHOR_REASSERT_MAX = 8

function findMarkdownPreviewAnchorTarget(body: HTMLElement, rawAnchor: string): HTMLElement | null {
  const decodedAnchor = decodeMarkdownPreviewAnchor(rawAnchor)
  for (const candidate of body.querySelectorAll<HTMLElement>('[id]')) {
    if (candidate.id === decodedAnchor) {
      return candidate
    }
  }
  return null
}

function isAnchorTargetInViewport(container: HTMLElement, target: HTMLElement): boolean {
  // Why: during mount/tab transitions the container can still be collapsed
  // (clientHeight 0, all rects stacked), so clientHeight gates the check.
  const containerRect = container.getBoundingClientRect()
  const targetTop = target.getBoundingClientRect().top
  return (
    container.clientHeight > 0 &&
    targetTop >= containerRect.top - ANCHOR_LANDED_TOLERANCE_PX &&
    targetTop <= containerRect.bottom + ANCHOR_LANDED_TOLERANCE_PX
  )
}

export function useMarkdownPreviewAnchorReveal({
  foundation,
  initialAnchor,
  content
}: {
  foundation: MarkdownPreviewFoundation
  initialAnchor: string | null
  content: string
}) {
  const { rootRef, bodyRef, lastAppliedInitialAnchorRef, renderedContent } = foundation

  const scrollToAnchor = useCallback(
    (rawAnchor: string): boolean => {
      const container = rootRef.current
      const body = bodyRef.current
      if (!container || !body) {
        return false
      }

      const target = findMarkdownPreviewAnchorTarget(body, rawAnchor)
      if (!target) {
        return false
      }

      container.scrollTo({ top: getMarkdownPreviewAnchorScrollTop(container, target) })
      // Why: during mount/tab transitions the container can still be
      // collapsed (clientHeight 0, all rects stacked), which turns the
      // scroll into a no-op at 0; only report success once the target is
      // actually in view so callers retry instead of stranding at the top.
      if (!isAnchorTargetInViewport(container, target)) {
        return false
      }
      target.focus({ preventScroll: true })
      return true
    },
    [bodyRef, rootRef]
  )

  const isAnchorInViewport = useCallback(
    (rawAnchor: string): boolean => {
      const container = rootRef.current
      const body = bodyRef.current
      if (!container || !body) {
        return false
      }
      const target = findMarkdownPreviewAnchorTarget(body, rawAnchor)
      if (!target) {
        return false
      }
      return isAnchorTargetInViewport(container, target)
    },
    [bodyRef, rootRef]
  )

  useLayoutEffect(() => {
    if (!initialAnchor || initialAnchor === lastAppliedInitialAnchorRef.current) {
      return
    }

    let timeoutId: number | null = null
    let attempts = 0
    let reassertIntervalId: number | null = null
    let userScrolled = false
    const markUserScroll = (): void => {
      userScrolled = true
    }
    // Why: any of these means the user took over the viewport, so stop re-asserting.
    window.addEventListener('pointerdown', markUserScroll, { capture: true, passive: true })
    window.addEventListener('wheel', markUserScroll, { capture: true, passive: true })
    window.addEventListener('touchstart', markUserScroll, { capture: true, passive: true })
    window.addEventListener('keydown', markUserScroll, { capture: true, passive: true })

    const stopReassertWatch = (): void => {
      if (reassertIntervalId !== null) {
        window.clearInterval(reassertIntervalId)
        reassertIntervalId = null
      }
    }

    const startReassertWatch = (): void => {
      // Why: Chromium can drop the container's scroll position after the
      // reveal (native overflow/tab transitions, focus-driven scrolls) with
      // no JS write or event to hook; verify real geometry for a grace
      // window and re-apply the reveal, unless the user takes over.
      let ticks = ANCHOR_REASSERT_TICKS
      let reassertions = 0
      reassertIntervalId = window.setInterval(() => {
        ticks -= 1
        if (userScrolled || ticks <= 0 || reassertions >= ANCHOR_REASSERT_MAX) {
          stopReassertWatch()
          return
        }
        if (isAnchorInViewport(initialAnchor)) {
          return
        }
        // target can be mid-re-render (absent); only budget real scrolls
        if (scrollToAnchor(initialAnchor)) {
          reassertions += 1
        }
      }, ANCHOR_REASSERT_INTERVAL_MS)
    }

    const tryRevealAnchor = (): void => {
      if (scrollToAnchor(initialAnchor)) {
        lastAppliedInitialAnchorRef.current = initialAnchor
        startReassertWatch()
        return
      }

      attempts += 1
      if (attempts < ANCHOR_REVEAL_MAX_ATTEMPTS) {
        // Why: a timer rather than rAF — hidden/background windows throttle
        // rAF, and scrollToAnchor now retries until layout lands the target.
        timeoutId = window.setTimeout(tryRevealAnchor, ANCHOR_REVEAL_RETRY_INTERVAL_MS)
      }
    }

    tryRevealAnchor()
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      stopReassertWatch()
      window.removeEventListener('pointerdown', markUserScroll, true)
      window.removeEventListener('wheel', markUserScroll, true)
      window.removeEventListener('touchstart', markUserScroll, true)
      window.removeEventListener('keydown', markUserScroll, true)
    }
    // Why: the body renders renderedContent, which can lag the raw content
    // prop by a paint (or the selection-deferral window) when the preview
    // instance is reused across a tab switch; re-arm the reveal when the
    // rendered DOM content catches up so the anchor is not stranded.
  }, [
    content,
    renderedContent,
    initialAnchor,
    lastAppliedInitialAnchorRef,
    isAnchorInViewport,
    scrollToAnchor
  ])

  return scrollToAnchor
}
