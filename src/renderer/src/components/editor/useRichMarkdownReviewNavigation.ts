import { useCallback, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { MarkdownReviewNote } from '@/lib/markdown-review-notes'
import { useMarkdownReviewNavigation } from './markdown-preview-review-navigation-context'

type UseRichMarkdownReviewNavigationOptions = {
  activeReviewCommentId: string | null
  markdownReviewContent: string
  markdownReviewNotes: readonly MarkdownReviewNote[]
  reviewRailOpen: boolean
  scrollReviewNoteIntoView: (commentId: string) => void
  setReviewRailOpen: Dispatch<SetStateAction<boolean>>
  sourceRelativePath: string | null
  worktreeId: string
}

export function useRichMarkdownReviewNavigation({
  activeReviewCommentId,
  markdownReviewContent,
  markdownReviewNotes,
  reviewRailOpen,
  scrollReviewNoteIntoView,
  setReviewRailOpen,
  sourceRelativePath,
  worktreeId
}: UseRichMarkdownReviewNavigationOptions): void {
  const { clearMarkdownReviewNavigation, registerMarkdownReviewNavigation } =
    useMarkdownReviewNavigation()
  const activeReviewNoteIndex = markdownReviewNotes.findIndex(
    (note) => note.id === activeReviewCommentId
  )
  const canGoToPrevious =
    markdownReviewNotes.length > 0 &&
    (activeReviewNoteIndex === -1 || activeReviewNoteIndex > 0)
  const canGoToNext =
    markdownReviewNotes.length > 0 &&
    (activeReviewNoteIndex === -1 || activeReviewNoteIndex < markdownReviewNotes.length - 1)
  const goToPreviousReviewNote = useCallback((): void => {
    const note =
      activeReviewNoteIndex === -1
        ? markdownReviewNotes.at(-1)
        : markdownReviewNotes[activeReviewNoteIndex - 1]
    if (note) {
      scrollReviewNoteIntoView(note.id)
    }
  }, [activeReviewNoteIndex, markdownReviewNotes, scrollReviewNoteIntoView])
  const goToNextReviewNote = useCallback((): void => {
    const note =
      activeReviewNoteIndex === -1
        ? markdownReviewNotes[0]
        : markdownReviewNotes[activeReviewNoteIndex + 1]
    if (note) {
      scrollReviewNoteIntoView(note.id)
    }
  }, [activeReviewNoteIndex, markdownReviewNotes, scrollReviewNoteIntoView])
  const toggleReviewRail = useCallback((): void => {
    setReviewRailOpen((open) => !open)
  }, [setReviewRailOpen])

  useEffect(() => {
    registerMarkdownReviewNavigation({
      canGoToPrevious,
      canGoToNext,
      goToPrevious: goToPreviousReviewNote,
      goToNext: goToNextReviewNote,
      reviewRailOpen,
      toggleReviewRail,
      source:
        sourceRelativePath !== null
          ? {
              worktreeId,
              filePath: sourceRelativePath,
              content: markdownReviewContent,
              notes: markdownReviewNotes
            }
          : null
    })
    return clearMarkdownReviewNavigation
  }, [
    canGoToNext,
    canGoToPrevious,
    clearMarkdownReviewNavigation,
    goToNextReviewNote,
    goToPreviousReviewNote,
    markdownReviewContent,
    markdownReviewNotes,
    registerMarkdownReviewNavigation,
    reviewRailOpen,
    sourceRelativePath,
    toggleReviewRail,
    worktreeId
  ])
}
