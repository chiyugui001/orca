import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { findRichMarkdownSearchMatches } from './rich-markdown-search'

type SearchMatch = ReturnType<typeof findRichMarkdownSearchMatches>[number]

/**
 * The replace side of rich-markdown find & replace. Split out of
 * useRichMarkdownSearch so the hook stays under the max-lines budget.
 *
 * Read-only documents reject every replace path: a dispatched replace would
 * mutate the view with no serialization path back to disk.
 */
export function useRichMarkdownSearchReplace({
  editor,
  readOnly,
  replaceQuery,
  activeMatchIndex,
  getLiveMatches
}: {
  editor: Editor | null
  readOnly: boolean
  replaceQuery: string
  activeMatchIndex: number
  getLiveMatches: () => SearchMatch[]
}): {
  replaceCurrentMatch: () => void
  replaceAllMatches: () => void
} {
  const replaceRange = useCallback(
    (from: number, to: number) => {
      if (!editor) {
        return
      }
      const tr = editor.state.tr
      // Why: empty replacement must delete the range — ProseMirror text nodes
      // can't hold an empty string, so insertText('') would be a no-op.
      if (replaceQuery) {
        tr.insertText(replaceQuery, from, to)
      } else {
        tr.delete(from, to)
      }
      editor.view.dispatch(tr)
    },
    [editor, replaceQuery]
  )

  const replaceCurrentMatch = useCallback(() => {
    const liveMatches = getLiveMatches()
    if (liveMatches.length === 0) {
      return
    }
    const liveActiveMatchIndex =
      activeMatchIndex >= 0 && activeMatchIndex < liveMatches.length ? activeMatchIndex : 0
    const match = liveMatches[liveActiveMatchIndex]
    if (!match || readOnly || liveMatches.some((candidate) => candidate.touchesReadOnlyAtom)) {
      return
    }
    // Why: removing the active match shifts the next match into the same index,
    // so leaving rawActiveMatchIndex untouched advances to it after recompute.
    replaceRange(match.from, match.to)
  }, [activeMatchIndex, getLiveMatches, readOnly, replaceRange])

  const replaceAllMatches = useCallback(() => {
    if (!editor) {
      return
    }
    const liveMatches = getLiveMatches()
    if (
      liveMatches.length === 0 ||
      readOnly ||
      liveMatches.some((candidate) => candidate.touchesReadOnlyAtom)
    ) {
      return
    }
    const tr = editor.state.tr
    // Why: process matches last-to-first so each edit can't invalidate the
    // positions of matches we haven't replaced yet, keeping it a single undo.
    for (let index = liveMatches.length - 1; index >= 0; index -= 1) {
      const match = liveMatches[index]
      if (replaceQuery) {
        tr.insertText(replaceQuery, match.from, match.to)
      } else {
        tr.delete(match.from, match.to)
      }
    }
    editor.view.dispatch(tr)
  }, [editor, getLiveMatches, readOnly, replaceQuery])

  return { replaceCurrentMatch, replaceAllMatches }
}
