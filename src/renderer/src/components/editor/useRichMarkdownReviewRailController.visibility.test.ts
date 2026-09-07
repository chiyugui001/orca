// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DiffComment } from '../../../../shared/diff-comment-types'
import { useRichMarkdownReviewRailController } from './useRichMarkdownReviewRailController'

const sampleComment: DiffComment = {
  id: 'note-1',
  worktreeId: 'worktree-1',
  filePath: 'notes.md',
  source: 'markdown',
  lineNumber: 1,
  body: 'Review this',
  createdAt: 0,
  side: 'modified'
}

describe('useRichMarkdownReviewRailController review note visibility', () => {
  it('opens the rich review rail when a preview adds a markdown note', () => {
    const editorRef = { current: null }
    const markdownSourceLineOffsetRef = { current: 0 }
    const scrollContainerRef = { current: null }
    const { result, rerender } = renderHook(
      ({ markdownComments }: { markdownComments: DiffComment[] }) =>
        useRichMarkdownReviewRailController({
          canAnnotateRichMarkdown: true,
          content: 'Body',
          editorRef,
          markdownComments,
          markdownSourceLineOffset: 0,
          markdownSourceLineOffsetRef,
          scrollContainerRef
        }),
      { initialProps: { markdownComments: [] as DiffComment[] } }
    )

    expect(result.current.reviewRailOpen).toBe(false)

    act(() => rerender({ markdownComments: [sampleComment] }))

    expect(result.current.reviewRailOpen).toBe(true)
  })
})
