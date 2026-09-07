import { describe, expect, it } from 'vitest'
import type { SleepingAgentSessionRecord } from '../../../shared/agent-session-resume'
import { makePaneKey } from '../../../shared/stable-pane-id'
import { deriveSleepingNotesSendTargets } from './sleeping-notes-send-targets'

const WORKTREE_ID = 'wt-1'
const TAB_ID = 'tab-1'
const LEAF_ID = '11111111-1111-4111-8111-111111111111'

function sleepingRecord(
  overrides: Partial<SleepingAgentSessionRecord> = {}
): SleepingAgentSessionRecord {
  return {
    paneKey: makePaneKey(TAB_ID, LEAF_ID),
    tabId: TAB_ID,
    worktreeId: WORKTREE_ID,
    agent: 'codex',
    providerSession: { key: 'session_id', id: 'sleeping-session' },
    prompt: 'continue',
    state: 'done',
    capturedAt: 1,
    updatedAt: 1,
    origin: 'worktree-sleep',
    restoreOnTabOpenOnly: true,
    ...overrides
  }
}

function stateFor(record: SleepingAgentSessionRecord): Record<string, unknown> {
  return {
    activeWorktreeId: WORKTREE_ID,
    sleepingAgentSessionsByPaneKey: { [record.paneKey]: record },
    tabsByWorktree: { [WORKTREE_ID]: [] },
    terminalLayoutsByTabId: {},
    ptyIdsByTabId: {}
  }
}

describe('deriveSleepingNotesSendTargets', () => {
  it('offers an explicitly selectable completed manual-sleep session', () => {
    const record = sleepingRecord()

    expect(deriveSleepingNotesSendTargets(stateFor(record) as never, WORKTREE_ID)).toEqual([
      expect.objectContaining({ paneKey: record.paneKey, status: 'eligible' })
    ])
  })

  it('does not offer a sleeping record whose pane has a live PTY', () => {
    const record = sleepingRecord()
    const state = stateFor(record)
    state.tabsByWorktree = {
      [WORKTREE_ID]: [{ id: TAB_ID, ptyId: null, worktreeId: WORKTREE_ID }]
    }
    state.terminalLayoutsByTabId = {
      [TAB_ID]: {
        root: { type: 'leaf', leafId: LEAF_ID },
        ptyIdsByLeafId: { [LEAF_ID]: 'pty-1' }
      }
    }
    state.ptyIdsByTabId = { [TAB_ID]: ['pty-1'] }

    expect(deriveSleepingNotesSendTargets(state as never, WORKTREE_ID)).toEqual([])
  })
})
