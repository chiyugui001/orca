import type { NotesSendAgentTarget } from '@/lib/notes-send-agent-targets'
import type { SleepingNotesSendTarget } from '@/lib/sleeping-notes-send-targets'

export function filterActiveNotesSendTargetsWithSleepingSessions(
  activeTargets: readonly NotesSendAgentTarget[],
  sleepingTargets: readonly SleepingNotesSendTarget[]
): NotesSendAgentTarget[] {
  const sleepingPaneKeys = new Set(sleepingTargets.map((target) => target.paneKey))
  return activeTargets.filter(
    (target) => target.status === 'eligible' || !sleepingPaneKeys.has(target.paneKey)
  )
}
