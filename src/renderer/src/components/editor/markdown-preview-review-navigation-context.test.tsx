// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MarkdownReviewNavigationProvider,
  useMarkdownReviewNavigation
} from './markdown-preview-review-navigation-context'

let navigation: ReturnType<typeof useMarkdownReviewNavigation> | null = null

function Probe(): null {
  navigation = useMarkdownReviewNavigation()
  return null
}

describe('MarkdownReviewNavigationProvider', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  function mount(): void {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root?.render(
        <MarkdownReviewNavigationProvider>
          <Probe />
        </MarkdownReviewNavigationProvider>
      )
    })
  }

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    container = null
    root = null
    navigation = null
  })

  it('routes header navigation controls to the current preview registration', () => {
    mount()
    const goToPrevious = vi.fn()
    const goToNext = vi.fn()

    act(() =>
      navigation?.registerMarkdownReviewNavigation({
        canGoToPrevious: true,
        canGoToNext: false,
        goToPrevious,
        goToNext,
        source: null
      })
    )

    expect(navigation?.canGoToPrevious).toBe(true)
    expect(navigation?.canGoToNext).toBe(false)
    act(() => navigation?.goToPreviousReviewNote())
    act(() => navigation?.goToNextReviewNote())
    expect(goToPrevious).toHaveBeenCalledOnce()
    expect(goToNext).toHaveBeenCalledOnce()
  })
})
