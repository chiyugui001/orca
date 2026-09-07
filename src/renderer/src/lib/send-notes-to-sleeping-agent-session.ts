import type { SleepingAgentSessionRecord } from '../../../shared/agent-session-resume'
import { useAppStore } from '@/store'
import { pasteDraftWhenAgentReady } from './agent-paste-draft'
import { resumeSleepingAgentSessionsForWorktree } from './resume-sleeping-agent-session'
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
  if (useAppStore.getState().sleepingAgentSessionsByPaneKey[record.paneKey] !== record) {
    return { status: 'wake-unavailable' }
  }

  let launchedTabId: string | null = null
  const launched = resumeSleepingAgentSessionsForWorktree(record.worktreeId, {
    onlyPaneKey: record.paneKey,
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
