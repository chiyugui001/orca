import React from 'react'
import { AgentStateDot } from '@/components/AgentStateDot'
import { AgentIcon } from '@/lib/agent-catalog'
import { agentTypeToIconAgent, formatAgentTypeLabel } from '@/lib/agent-status'
import type { SleepingNotesSendTarget } from '@/lib/sleeping-notes-send-targets'
import { translate } from '@/i18n/i18n'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function ReviewNotesSleepingSessionMenuItem({
  target,
  disabled,
  onSend
}: {
  target: SleepingNotesSendTarget
  disabled: boolean
  onSend: (target: SleepingNotesSendTarget) => void
}): React.JSX.Element {
  const agentTypeLabel = formatAgentTypeLabel(target.agentType)
  const title = target.terminalTitle || agentTypeLabel
  const disabledReason = target.status === 'disabled' ? target.disabledReason : undefined
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={() => onSend(target)}
      title={disabledReason}
      className="min-w-[240px] gap-2 rounded-[7px] px-2 py-1.5 text-[12px] leading-5 font-medium"
    >
      <AgentStateDot state="idle" size="sm" className="shrink-0" title={disabledReason ? null : undefined} />
      <AgentIcon agent={agentTypeToIconAgent(target.agentType)} size={14} />
      <span className="grid min-w-0 flex-1 text-left">
        <span className="truncate">{title}</span>
        <span className="truncate text-[11px] font-normal text-muted-foreground">
          {translate(
            'auto.components.editor.ReviewNotesSendMenuContent.wake-and-send',
            '{{value0}} will resume, then receive the notes',
            { value0: agentTypeLabel }
          )}
        </span>
      </span>
    </DropdownMenuItem>
  )
}
