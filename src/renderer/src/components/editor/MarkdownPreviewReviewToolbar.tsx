import { ArrowDown, ArrowUp, Check, Copy, MessageSquare } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { translate } from '@/i18n/i18n'
import {
  formatMarkdownReviewNotes,
  type MarkdownReviewNote
} from '@/lib/markdown-review-notes'
import { copyMarkdownReviewNotesForAgent } from '@/lib/markdown-review-note-copy'
import { useAppStore } from '@/store'
import { NotesSendMenu } from './NotesSendMenu'
import { useMarkdownReviewNavigation } from './markdown-preview-review-navigation-context'

export function MarkdownPreviewReviewToolbar({
  worktreeId,
  groupId,
  filePath,
  content,
  notes
}: {
  worktreeId: string
  groupId: string
  filePath: string
  content: string
  notes: readonly MarkdownReviewNote[]
}): React.JSX.Element {
  const clearDeliveredDiffComments = useAppStore((s) => s.clearDeliveredDiffComments)
  const {
    canGoToPrevious,
    canGoToNext,
    goToPreviousReviewNote,
    goToNextReviewNote
  } = useMarkdownReviewNavigation()
  const [reviewNotesCopied, setReviewNotesCopied] = useState(false)
  const copiedResetTimerRef = useRef<number | null>(null)
  const unsentNotes = useMemo(() => notes.filter((note) => !note.sentAt), [notes])
  const unsentMarkdownReviewScope = useMemo(
    () => [
      {
        id: 'all',
        label: translate('auto.components.editor.MarkdownPreview.ddf087d12e', 'All unsent notes'),
        notes: unsentNotes,
        prompt: formatMarkdownReviewNotes(unsentNotes, content)
      }
    ],
    [content, unsentNotes]
  )

  useEffect(
    () => () => {
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current)
      }
    },
    []
  )

  const handleCopyMarkdownReviewNotes = async (): Promise<void> => {
    if (notes.length === 0) {
      return
    }
    try {
      const copied = await copyMarkdownReviewNotesForAgent({
        notes,
        content,
        writeClipboardText: window.api.ui.writeClipboardText
      })
      if (!copied) {
        return
      }
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current)
      }
      setReviewNotesCopied(true)
      copiedResetTimerRef.current = window.setTimeout(() => {
        copiedResetTimerRef.current = null
        setReviewNotesCopied(false)
      }, 1600)
    } catch {
      // Best-effort clipboard action; failures usually mean the window is not focused.
    }
  }

  return (
    <>
      <button
        type="button"
        className="h-6 shrink-0 gap-1 rounded-full border border-border/70 bg-muted/40 px-2 text-[11px] font-medium leading-none text-foreground/80 hover:bg-accent hover:text-foreground disabled:opacity-50"
        onClick={goToNextReviewNote}
        disabled={!canGoToNext}
        title={translate(
          'auto.components.editor.MarkdownPreview.322afab6ff',
          'Review notes'
        )}
        aria-label={translate(
          'auto.components.editor.MarkdownPreview.322afab6ff',
          'Review notes'
        )}
      >
        <MessageSquare className="size-3.5" />
        <span>
          {translate('auto.components.editor.MarkdownPreview.322afab6ff', 'Review notes')}
        </span>
        <span className="markdown-review-count">{notes.length}</span>
      </button>
      <button
        type="button"
        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        onClick={goToPreviousReviewNote}
        disabled={!canGoToPrevious}
        title={translate(
          'auto.components.editor.MarkdownPreview.1dcad658c4',
          'Previous review note'
        )}
        aria-label={translate(
          'auto.components.editor.MarkdownPreview.1dcad658c4',
          'Previous review note'
        )}
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        onClick={goToNextReviewNote}
        disabled={!canGoToNext}
        title={translate(
          'auto.components.editor.MarkdownPreview.563a5ce988',
          'Next review note'
        )}
        aria-label={translate(
          'auto.components.editor.MarkdownPreview.563a5ce988',
          'Next review note'
        )}
      >
        <ArrowDown className="size-3.5" />
      </button>
      <button
        type="button"
        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        onClick={() => void handleCopyMarkdownReviewNotes()}
        disabled={notes.length === 0}
        title={translate(
          'auto.components.editor.MarkdownPreview.bb629de58a',
          'Copy notes for agent'
        )}
        aria-label={translate(
          'auto.components.editor.MarkdownPreview.bb629de58a',
          'Copy notes for agent'
        )}
      >
        {reviewNotesCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <NotesSendMenu
        worktreeId={worktreeId}
        groupId={groupId}
        modeIdParts={['markdown-notes', worktreeId, filePath, 'preview-header']}
        scopes={unsentMarkdownReviewScope}
        triggerClassName="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        onDelivered={(deliveredNotes) =>
          void clearDeliveredDiffComments(worktreeId, deliveredNotes)
        }
      />
    </>
  )
}
