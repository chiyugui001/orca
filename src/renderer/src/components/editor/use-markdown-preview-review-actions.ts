import { useCallback, useEffect } from 'react'
import { copyMarkdownReviewNotesForAgent } from '@/lib/markdown-review-note-copy'
import type { MarkdownReviewNote } from '@/lib/markdown-review-notes'
import type { DiffComment } from '../../../../shared/diff-comment-types'
import type { MarkdownPreviewBlockRange } from './markdown-preview-types'
import type { MarkdownPreviewFoundation } from './use-markdown-preview-foundation'
import type { MarkdownPreviewViewport } from './use-markdown-preview-viewport'
import { useMarkdownReviewNavigation } from './markdown-preview-review-navigation-context'

function isMarkdownAnnotationNavigationClick(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return !target.closest(
    'a,button,input,textarea,select,summary,[contenteditable="true"],.markdown-annotation-controls'
  )
}

export function useMarkdownPreviewReviewActions({
  foundation,
  viewport
}: {
  foundation: MarkdownPreviewFoundation
  viewport: MarkdownPreviewViewport
}) {
  const {
    rootRef,
    renderedContent,
    markdownReviewNotes,
    reviewNotesCopyMountedRef,
    setReviewNotesCopied,
    reviewNotesCopiedResetTimerRef,
    setCopiedReviewNoteId,
    copiedReviewNoteResetTimerRef,
    attentionReviewCommentTimeoutRef,
    setAttentionReviewCommentId,
    setActiveReviewCommentId,
    markdownComments,
    activeReviewCommentId,
    sourceWorktree,
    sourceRelativePath,
    canShowReviewTools
  } = foundation
  const { clearReviewNotesCopiedResetTimer, clearCopiedReviewNoteResetTimer } = viewport
  const {
    registerMarkdownReviewNavigation,
    clearMarkdownReviewNavigation
  } = useMarkdownReviewNavigation()

  const handleCopyMarkdownReviewNotes = useCallback(async (): Promise<void> => {
    if (markdownReviewNotes.length === 0) {
      return
    }
    try {
      const copied = await copyMarkdownReviewNotesForAgent({
        notes: markdownReviewNotes,
        content: renderedContent,
        writeClipboardText: window.api.ui.writeClipboardText
      })
      if (!copied || !reviewNotesCopyMountedRef.current) {
        return
      }
      clearReviewNotesCopiedResetTimer()
      setReviewNotesCopied(true)
      reviewNotesCopiedResetTimerRef.current = window.setTimeout(() => {
        reviewNotesCopiedResetTimerRef.current = null
        setReviewNotesCopied(false)
      }, 1600)
    } catch {
      // Best-effort clipboard action; failures usually mean the window is not focused.
    }
  }, [
    clearReviewNotesCopiedResetTimer,
    markdownReviewNotes,
    renderedContent,
    reviewNotesCopyMountedRef,
    reviewNotesCopiedResetTimerRef,
    setReviewNotesCopied
  ])

  const handleCopyMarkdownReviewNote = useCallback(
    async (note: MarkdownReviewNote): Promise<void> => {
      try {
        const copied = await copyMarkdownReviewNotesForAgent({
          notes: [note],
          content: renderedContent,
          writeClipboardText: window.api.ui.writeClipboardText
        })
        if (!copied || !reviewNotesCopyMountedRef.current) {
          return
        }
        clearCopiedReviewNoteResetTimer()
        setCopiedReviewNoteId(note.id)
        copiedReviewNoteResetTimerRef.current = window.setTimeout(() => {
          copiedReviewNoteResetTimerRef.current = null
          setCopiedReviewNoteId(null)
        }, 1600)
      } catch {
        // Best-effort clipboard action; failures usually mean the window is not focused.
      }
    },
    [
      clearCopiedReviewNoteResetTimer,
      copiedReviewNoteResetTimerRef,
      renderedContent,
      reviewNotesCopyMountedRef,
      setCopiedReviewNoteId
    ]
  )

  const pulseRenderedMarkdownReviewNote = useCallback(
    (commentId: string): void => {
      if (attentionReviewCommentTimeoutRef.current !== null) {
        window.clearTimeout(attentionReviewCommentTimeoutRef.current)
      }
      setAttentionReviewCommentId(null)
      window.requestAnimationFrame(() => {
        setAttentionReviewCommentId(commentId)
        attentionReviewCommentTimeoutRef.current = window.setTimeout(() => {
          setAttentionReviewCommentId(null)
          attentionReviewCommentTimeoutRef.current = null
        }, 900)
      })
    },
    [attentionReviewCommentTimeoutRef, setAttentionReviewCommentId]
  )

  const findRenderedMarkdownReviewNoteCard = useCallback(
    (commentId: string): HTMLElement | null => {
      const root = rootRef.current
      if (!root) {
        return null
      }
      return (
        Array.from(root.querySelectorAll<HTMLElement>('[data-markdown-review-note-id]')).find(
          (candidate) => candidate.dataset.markdownReviewNoteId === commentId
        ) ?? null
      )
    },
    [rootRef]
  )

  const scrollRenderedMarkdownReviewNoteIntoView = useCallback(
    (comment: DiffComment): void => {
      setActiveReviewCommentId(comment.id)
      pulseRenderedMarkdownReviewNote(comment.id)
      window.requestAnimationFrame(() => {
        findRenderedMarkdownReviewNoteCard(comment.id)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        })
      })
    },
    [findRenderedMarkdownReviewNoteCard, pulseRenderedMarkdownReviewNote, setActiveReviewCommentId]
  )

  const scrollToReviewNote = useCallback(
    (comment: DiffComment): void => {
      setActiveReviewCommentId(comment.id)
      const root = rootRef.current
      if (!root) {
        return
      }
      const blocks = root.querySelectorAll<HTMLElement>('[data-source-line][data-source-end-line]')
      let target: HTMLElement | null = null
      for (const block of blocks) {
        const startLine = Number(block.dataset.sourceLine)
        const endLine = Number(block.dataset.sourceEndLine)
        if (startLine <= comment.lineNumber && comment.lineNumber <= endLine) {
          target = block
          break
        }
      }
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [rootRef, setActiveReviewCommentId]
  )

  const getMarkdownCommentsForRange = useCallback(
    (range: MarkdownPreviewBlockRange): DiffComment[] =>
      markdownComments.filter(
        (comment) => range.startLine <= comment.lineNumber && comment.lineNumber <= range.endLine
      ),
    [markdownComments]
  )

  const handleAnnotatedMarkdownBlockClick = useCallback(
    (range: MarkdownPreviewBlockRange, event: React.MouseEvent<HTMLElement>): void => {
      if (!isMarkdownAnnotationNavigationClick(event.target)) {
        return
      }
      const commentsForBlock = getMarkdownCommentsForRange(range)
      const comment =
        commentsForBlock.find((candidate) => candidate.id !== activeReviewCommentId) ??
        commentsForBlock[0]
      if (!comment) {
        return
      }
      scrollRenderedMarkdownReviewNoteIntoView(comment)
    },
    [activeReviewCommentId, getMarkdownCommentsForRange, scrollRenderedMarkdownReviewNoteIntoView]
  )

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
      scrollRenderedMarkdownReviewNoteIntoView(note)
    }
  }, [activeReviewNoteIndex, markdownReviewNotes, scrollRenderedMarkdownReviewNoteIntoView])
  const goToNextReviewNote = useCallback((): void => {
    const note =
      activeReviewNoteIndex === -1
        ? markdownReviewNotes[0]
        : markdownReviewNotes[activeReviewNoteIndex + 1]
    if (note) {
      scrollRenderedMarkdownReviewNoteIntoView(note)
    }
  }, [activeReviewNoteIndex, markdownReviewNotes, scrollRenderedMarkdownReviewNoteIntoView])

  useEffect(() => {
    registerMarkdownReviewNavigation({
      canGoToPrevious,
      canGoToNext,
      goToPrevious: goToPreviousReviewNote,
      goToNext: goToNextReviewNote,
      source:
        canShowReviewTools && sourceWorktree && sourceRelativePath !== null
          ? {
              worktreeId: sourceWorktree.id,
              filePath: sourceRelativePath,
              content: renderedContent,
              notes: markdownReviewNotes
            }
          : null
    })
    return clearMarkdownReviewNavigation
  }, [
    canGoToNext,
    canGoToPrevious,
    clearMarkdownReviewNavigation,
    canShowReviewTools,
    goToNextReviewNote,
    goToPreviousReviewNote,
    markdownReviewNotes,
    registerMarkdownReviewNavigation,
    renderedContent,
    sourceRelativePath,
    sourceWorktree
  ])

  return {
    handleCopyMarkdownReviewNotes,
    handleCopyMarkdownReviewNote,
    scrollToReviewNote,
    getMarkdownCommentsForRange,
    handleAnnotatedMarkdownBlockClick
  }
}

export type MarkdownPreviewReviewActions = ReturnType<typeof useMarkdownPreviewReviewActions>
