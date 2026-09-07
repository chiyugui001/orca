import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SleepingAgentSessionRecord } from '../../../shared/agent-session-resume'
import { useAppStore } from '@/store'

const harness = vi.hoisted(() => ({
  pasteDraftWhenAgentReady: vi.fn(),
  resumeSleepingAgentSessionsForWorktree: vi.fn()
}))

vi.mock('./agent-paste-draft', () => ({
  pasteDraftWhenAgentReady: harness.pasteDraftWhenAgentReady
}))

vi.mock('./resume-sleeping-agent-session', () => ({
  resumeSleepingAgentSessionsForWorktree: harness.resumeSleepingAgentSessionsForWorktree
}))

import { wakeSleepingAgentSessionAndSendNotes } from './send-notes-to-sleeping-agent-session'

const record: SleepingAgentSessionRecord = {
  paneKey: 'old-tab:old-leaf',
  tabId: 'old-tab',
  worktreeId: 'wt-1',
  agent: 'codex',
  providerSession: { key: 'session_id', id: 'session-1' },
  prompt: 'continue',
  state: 'working',
  capturedAt: 1,
  updatedAt: 1,
  origin: 'quit'
}

const initialAppStoreState = useAppStore.getState()

describe('wakeSleepingAgentSessionAndSendNotes', () => {
  beforeEach(() => {
    harness.pasteDraftWhenAgentReady.mockReset()
    harness.resumeSleepingAgentSessionsForWorktree.mockReset()
    useAppStore.setState({ sleepingAgentSessionsByPaneKey: { [record.paneKey]: record } } as never)
  })

  afterEach(() => {
    useAppStore.setState(initialAppStoreState, true)
  })

  it('resumes the selected record in the background and waits to submit its notes', async () => {
    harness.resumeSleepingAgentSessionsForWorktree.mockImplementation(
      (_worktreeId: string, options: { onSessionLaunched: (tabId: string) => void }) => {
        options.onSessionLaunched('resumed-tab')
        return 1
      }
    )
    harness.pasteDraftWhenAgentReady.mockResolvedValue(true)

    await expect(
      wakeSleepingAgentSessionAndSendNotes({ record, prompt: 'Please address this comment.' })
    ).resolves.toEqual({ status: 'sent' })

    expect(harness.resumeSleepingAgentSessionsForWorktree).toHaveBeenCalledWith('wt-1', {
      onlyPaneKey: record.paneKey,
      suppressNavigation: true,
      onSessionLaunched: expect.any(Function)
    })
    expect(harness.pasteDraftWhenAgentReady).toHaveBeenCalledWith({
      tabId: 'resumed-tab',
      content: 'Please address this comment.',
      agent: 'codex',
      submit: true
    })
  })

  it('does not paste when the session cannot be resumed safely', async () => {
    harness.resumeSleepingAgentSessionsForWorktree.mockReturnValue(0)

    await expect(wakeSleepingAgentSessionAndSendNotes({ record, prompt: 'Review this.' })).resolves.toEqual({
      status: 'wake-unavailable'
    })
    expect(harness.pasteDraftWhenAgentReady).not.toHaveBeenCalled()
  })
})
