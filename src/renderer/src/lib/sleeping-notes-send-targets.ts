import type { AppState } from '@/store/types'
import { AGENT_STATUS_STALE_AFTER_MS } from '../../../shared/agent-status-types'
import type { SleepingAgentSessionRecord } from '../../../shared/agent-session-resume'
import {
  getProviderSessionClaimKey,
  isPassiveCompletedHibernationEvidence,
  recordPaneIsOwnedByPreservedPane
} from './sleeping-agent-pane-ownership'
import type { WorkspaceTerminalHostAuthority } from './workspace-terminal-host-authority'

export type SleepingNotesSendTarget = {
  paneKey: string
  agentType: SleepingAgentSessionRecord['agent']
  terminalTitle?: string
  record: SleepingAgentSessionRecord
  status: 'eligible' | 'disabled'
  disabledReason?: string
}

export function deriveSleepingNotesSendTargets(
  state: Pick<
    AppState,
    | 'sleepingAgentSessionsByPaneKey'
    | 'tabsByWorktree'
    | 'terminalLayoutsByTabId'
    | 'ptyIdsByTabId'
    | 'activeWorktreeId'
  >,
  worktreeId: string,
  hostAuthority: WorkspaceTerminalHostAuthority = 'none'
): SleepingNotesSendTarget[] {
  const newestRecordByClaim = new Map<string, SleepingAgentSessionRecord>()
  for (const record of Object.values(state.sleepingAgentSessionsByPaneKey)) {
    if (record.worktreeId !== worktreeId || !isSendableSleepingRecord(record)) {
      continue
    }
    const claimKey = getProviderSessionClaimKey(record)
    const current = newestRecordByClaim.get(claimKey)
    if (
      !current ||
      record.capturedAt > current.capturedAt ||
      (record.capturedAt === current.capturedAt && record.updatedAt > current.updatedAt)
    ) {
      newestRecordByClaim.set(claimKey, record)
    }
  }

  return [...newestRecordByClaim.values()]
    .filter((record) => !recordPaneIsOwnedByPreservedPane(record, state as AppState))
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map((record) => {
      const disabledReason =
        hostAuthority === 'unverifiable' ? 'Connection status is unavailable' : undefined
      return {
        paneKey: record.paneKey,
        agentType: record.agent,
        ...(record.terminalTitle?.trim() ? { terminalTitle: record.terminalTitle.trim() } : {}),
        record,
        status: disabledReason ? 'disabled' : 'eligible',
        ...(disabledReason ? { disabledReason } : {})
      }
    })
}

function isSendableSleepingRecord(record: SleepingAgentSessionRecord): boolean {
  if (
    record.automaticResumeBlockedBy ||
    record.restoreOnTabOpenOnly ||
    isPassiveCompletedHibernationEvidence(record)
  ) {
    return false
  }
  return record.state === 'done' || record.capturedAt - record.updatedAt <= AGENT_STATUS_STALE_AFTER_MS
}
