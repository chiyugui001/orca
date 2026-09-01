import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { PRComment } from '../../../../../shared/github/comment-types'
import type { PRCommentGroup } from '../../../../../shared/pr-comment-groups'
import { mergePRCommentIntoList } from '@/store/github/pr-comment-cache'
import { translate } from '@/i18n/i18n'
import type { RightPanelCommentSubmitResult } from '../right-panel-comment-composer'
import type { ChecksPanelControllerState } from './use-checks-panel-controller-state'
import type { ChecksPanelContextState } from './use-checks-panel-context-state'
import type { ChecksPanelCommentResolutionState } from './use-checks-panel-comment-resolution'
import type { ChecksPanelPollingState } from './use-checks-panel-polling'
import {
  addGitLabMRCommentForChecks,
  deleteGitLabMRCommentForChecks,
  replyGitLabMRDiscussionForChecks
} from './gitlab-review-client'

type ChecksPanelGitLabCommentMutationsInput = Pick<
  ChecksPanelControllerState,
  'confirm' | 'repo' | 'setComments' | 'settings'
> &
  Pick<ChecksPanelContextState, 'activeGitLabReview'> &
  Pick<ChecksPanelCommentResolutionState, 'commentsDisabledReason'> &
  Pick<ChecksPanelPollingState, 'fetchGitLabDetails'>

export function useChecksPanelGitLabCommentMutations(
  model: ChecksPanelGitLabCommentMutationsInput
) {
  const {
    activeGitLabReview,
    commentsDisabledReason,
    confirm,
    fetchGitLabDetails,
    repo,
    setComments,
    settings
  } = model
  const mutationArgs = useMemo(
    () =>
      repo && activeGitLabReview
        ? {
            repoPath: repo.path,
            repoId: repo.id,
            settings,
            iid: activeGitLabReview.number
          }
        : null,
    [activeGitLabReview, repo, settings]
  )

  const handleAddMRComment = useCallback(
    async (body: string): Promise<RightPanelCommentSubmitResult> => {
      if (!mutationArgs) {
        return { ok: false, error: commentsDisabledReason ?? 'Commenting unavailable.' }
      }
      try {
        const result = await addGitLabMRCommentForChecks({ ...mutationArgs, body })
        if (!result.ok) {
          toast.error(result.error)
          return result
        }
        setComments((comments) => mergePRCommentIntoList(comments, result.comment as PRComment))
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to post comment.'
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [commentsDisabledReason, mutationArgs, setComments]
  )

  const handleReplyToMRComment = useCallback(
    async (comment: PRComment, body: string): Promise<RightPanelCommentSubmitResult> => {
      if (!mutationArgs || !comment.threadId) {
        return { ok: false, error: commentsDisabledReason ?? 'Commenting unavailable.' }
      }
      try {
        const result = await replyGitLabMRDiscussionForChecks({
          ...mutationArgs,
          discussionId: comment.threadId,
          body
        })
        if (!result.ok) {
          toast.error(result.error)
          return result
        }
        const reply = {
          ...(result.comment as PRComment),
          threadId: result.comment.threadId ?? comment.threadId,
          path: result.comment.path ?? comment.path,
          line: result.comment.line ?? comment.line
        }
        setComments((comments) => mergePRCommentIntoList(comments, reply))
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to post reply.'
        toast.error(message)
        return { ok: false, error: message }
      }
    },
    [commentsDisabledReason, mutationArgs, setComments]
  )

  const handleDeleteMRComment = useCallback(
    async (comment: PRComment): Promise<void> => {
      if (!mutationArgs) {
        return
      }
      const confirmed = await confirm({
        title: translate('auto.components.right.sidebar.ChecksPanel.ea9b649ce3', 'Delete comment?'),
        description: 'This will permanently remove the comment from the MR.',
        confirmLabel: translate('auto.components.right.sidebar.ChecksPanel.786e3c143f', 'Delete'),
        confirmVariant: 'destructive'
      })
      if (!confirmed) {
        return
      }
      try {
        const result = await deleteGitLabMRCommentForChecks({
          ...mutationArgs,
          noteId: comment.id
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        setComments((comments) => comments.filter((entry) => entry.id !== comment.id))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete comment.')
      }
    },
    [confirm, mutationArgs, setComments]
  )

  const handleReplyToMRThreads = useCallback(
    async (groups: PRCommentGroup[]): Promise<void> => {
      if (!mutationArgs) {
        return
      }
      const discussionIds = groups.flatMap((group) =>
        group.kind === 'thread' && group.threadId ? [group.threadId] : []
      )
      if (discussionIds.length === 0) {
        toast.message('No commentable threads selected.')
        return
      }
      let succeeded = 0
      for (const discussionId of discussionIds) {
        try {
          const result = await replyGitLabMRDiscussionForChecks({
            ...mutationArgs,
            discussionId,
            body: 'Reviewed.'
          })
          if (result.ok) {
            succeeded += 1
          }
        } catch {
          // Aggregate failures after all selected threads have been attempted.
        }
      }
      const failed = discussionIds.length - succeeded
      if (failed === 0) {
        toast.success(`Replied to ${succeeded} thread${succeeded === 1 ? '' : 's'} on MR.`)
      } else {
        toast.error(`Replied to ${succeeded}, failed ${failed}.`)
      }
      void fetchGitLabDetails()
    },
    [fetchGitLabDetails, mutationArgs]
  )

  return {
    handleAddMRComment,
    handleDeleteMRComment,
    handleReplyToMRComment,
    handleReplyToMRThreads
  }
}

export type ChecksPanelGitLabCommentMutationState = ReturnType<
  typeof useChecksPanelGitLabCommentMutations
>
