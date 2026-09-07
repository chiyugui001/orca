import { afterEach, describe, expect, it } from 'vitest'
import type { SleepingAgentSessionRecord } from '../../../shared/agent-session-resume'
import { useAppStore } from '@/store'
import { resumeSleepingAgentSessionsForWorktree } from './resume-sleeping-agent-session'

const initialAppStoreState = useAppStore.getState()

afterEach(() => {
  useAppStore.setState(initialAppStoreState, true)
})

function record(
  paneKey: string,
  sessionId: string
): SleepingAgentSessionRecord {
  return {
    paneKey,
    worktreeId: 'wt-1',
    agent: 'codex',
    providerSession: { key: 'session_id', id: sessionId },
    prompt: 'continue',
    state: 'working',
    capturedAt: 1,
    updatedAt: 1,
    origin: 'quit'
  }
}

describe('resumeSleepingAgentSessionsForWorktree selection', () => {
  it('resumes only the sleeping pane selected by a note', () => {
    const first = record('old-a:leaf-a', 'session-a')
    const selected = record('old-b:leaf-b', 'session-b')
    useAppStore.setState({
      tabsByWorktree: { 'wt-1': [] },
      sleepingAgentSessionsByPaneKey: {
        [first.paneKey]: first,
        [selected.paneKey]: selected
      }
    } as never)

    expect(
      resumeSleepingAgentSessionsForWorktree('wt-1', { onlyPaneKey: selected.paneKey })
    ).toBe(1)

    const state = useAppStore.getState()
    expect(state.sleepingAgentSessionsByPaneKey[first.paneKey]).toBe(first)
    expect(state.sleepingAgentSessionsByPaneKey[selected.paneKey]).toBeUndefined()
  })
})
