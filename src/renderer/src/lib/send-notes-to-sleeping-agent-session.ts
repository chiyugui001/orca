import type { SleepingAgentSessionRecord } from '../../../shared/agent-session-resume'
import { useAppStore } from '@/store'
import { pasteDraftWhenAgentReady } from './agent-paste-draft'
import { resumeSleepingAgentSessionsForWorktree } from './resume-sleeping-agent-session'
import { recordPaneHasLivePty } from './sleeping-agent-pane-ownership'
import type { ActiveAgentNotesSendResult } from './active-agent-note-send-result'

export async function wakeSleepingAgentSessionAndSendNotes({
  record,
  prompt
}: {
  record: SleepingAgentSessionRecord
  prompt: string
}): Promise<ActiveAgentNotesSendResult> {
  const content = prompt.trim()
  if (!content) {
    return { status: 'empty' }
  }
  const state = useAppStore.getState()
  if (
    state.sleepingAgentSessionsByPaneKey[record.paneKey] !== record ||
    recordPaneHasLivePty(record, state)
  ) {
    return { status: 'wake-unavailable' }
  }

  let launchedTabId: string | null = null
  const launched = resumeSleepingAgentSessionsForWorktree(record.worktreeId, {
    onlyPaneKey: record.paneKey,
    allowPassiveCompletedResume: true,
    suppressNavigation: true,
    onSessionLaunched: (tabId) => {
      launchedTabId = tabId
    }
  })
  if (launched !== 1 || !launchedTabId) {
    return { status: 'wake-unavailable' }
  }

  const sent = await pasteDraftWhenAgentReady({
    tabId: launchedTabId,
    content,
    agent: record.agent,
    submit: true
  })
  return sent ? { status: 'sent' } : { status: 'not-ready' }
}
