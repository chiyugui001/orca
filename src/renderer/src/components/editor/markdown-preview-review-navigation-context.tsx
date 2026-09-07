import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { MarkdownReviewNote } from '@/lib/markdown-review-notes'

export type MarkdownReviewNavigationSource = {
  worktreeId: string
  filePath: string
  content: string
  notes: readonly MarkdownReviewNote[]
}

type MarkdownReviewNavigationRegistration = {
  canGoToPrevious: boolean
  canGoToNext: boolean
  goToPrevious: () => void
  goToNext: () => void
  reviewRailOpen?: boolean
  toggleReviewRail?: () => void
  source: MarkdownReviewNavigationSource | null
}

type MarkdownReviewNavigationState = Pick<
  MarkdownReviewNavigationRegistration,
  'canGoToPrevious' | 'canGoToNext' | 'reviewRailOpen' | 'toggleReviewRail'
> & { source: MarkdownReviewNavigationSource | null }

type MarkdownReviewNavigationContextValue = MarkdownReviewNavigationState & {
  registerMarkdownReviewNavigation: (registration: MarkdownReviewNavigationRegistration) => void
  clearMarkdownReviewNavigation: () => void
  goToPreviousReviewNote: () => void
  goToNextReviewNote: () => void
  reviewRailOpen?: boolean
  toggleReviewRail?: () => void
}

const EMPTY_STATE: MarkdownReviewNavigationState = {
  canGoToPrevious: false,
  canGoToNext: false,
  source: null
}

const MarkdownReviewNavigationContext = createContext<MarkdownReviewNavigationContextValue>({
  ...EMPTY_STATE,
  registerMarkdownReviewNavigation: () => {},
  clearMarkdownReviewNavigation: () => {},
  goToPreviousReviewNote: () => {},
  goToNextReviewNote: () => {}
})

export function MarkdownReviewNavigationProvider({
  children
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const registrationRef = useRef<MarkdownReviewNavigationRegistration | null>(null)
  const [state, setState] = useState<MarkdownReviewNavigationState>(EMPTY_STATE)

  const registerMarkdownReviewNavigation = useCallback(
    (registration: MarkdownReviewNavigationRegistration): void => {
      registrationRef.current = registration
      setState((current) =>
        current.canGoToPrevious === registration.canGoToPrevious &&
        current.canGoToNext === registration.canGoToNext &&
        current.source?.worktreeId === registration.source?.worktreeId &&
        current.source?.filePath === registration.source?.filePath &&
        current.source?.content === registration.source?.content &&
        current.source?.notes === registration.source?.notes &&
        current.reviewRailOpen === registration.reviewRailOpen &&
        current.toggleReviewRail === registration.toggleReviewRail
          ? current
          : {
              canGoToPrevious: registration.canGoToPrevious,
              canGoToNext: registration.canGoToNext,
              ...(registration.reviewRailOpen === undefined
                ? {}
                : { reviewRailOpen: registration.reviewRailOpen }),
              ...(registration.toggleReviewRail === undefined
                ? {}
                : { toggleReviewRail: registration.toggleReviewRail }),
              source: registration.source
            }
      )
    },
    []
  )

  const clearMarkdownReviewNavigation = useCallback((): void => {
    registrationRef.current = null
    setState(EMPTY_STATE)
  }, [])

  const goToPreviousReviewNote = useCallback((): void => {
    registrationRef.current?.goToPrevious()
  }, [])

  const goToNextReviewNote = useCallback((): void => {
    registrationRef.current?.goToNext()
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      registerMarkdownReviewNavigation,
      clearMarkdownReviewNavigation,
      goToPreviousReviewNote,
      goToNextReviewNote
    }),
    [
      clearMarkdownReviewNavigation,
      goToNextReviewNote,
      goToPreviousReviewNote,
      registerMarkdownReviewNavigation,
      state
    ]
  )

  return (
    <MarkdownReviewNavigationContext.Provider value={value}>
      {children}
    </MarkdownReviewNavigationContext.Provider>
  )
}

export function useMarkdownReviewNavigation(): MarkdownReviewNavigationContextValue {
  return useContext(MarkdownReviewNavigationContext)
}
