import { describe, expect, it } from 'vitest'
import type { NotesSendAgentTarget } from '@/lib/notes-send-agent-targets'
import type { SleepingNotesSendTarget } from '@/lib/sleeping-notes-send-targets'
import { filterActiveNotesSendTargetsWithSleepingSessions } from './review-notes-send-target-partition'

function activeTarget(status: NotesSendAgentTarget['status']): NotesSendAgentTarget {
  return {
    paneKey: 'tab-1:leaf-1',
    tabId: 'tab-1',
    leafId: 'leaf-1',
    agentType: 'codex',
    tabTitle: 'Codex',
    status
  }
}

const sleepingTarget = { paneKey: 'tab-1:leaf-1' } as SleepingNotesSendTarget

describe('filterActiveNotesSendTargetsWithSleepingSessions', () => {
  it('replaces a disabled active row with its selectable sleeping session', () => {
    expect(filterActiveNotesSendTargetsWithSleepingSessions([activeTarget('disabled')], [sleepingTarget]))
      .toEqual([])
  })

  it('retains a directly sendable active session', () => {
    expect(filterActiveNotesSendTargetsWithSleepingSessions([activeTarget('eligible')], [sleepingTarget]))
      .toEqual([activeTarget('eligible')])
  })
})
