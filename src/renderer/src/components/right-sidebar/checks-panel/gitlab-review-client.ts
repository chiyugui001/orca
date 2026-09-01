import type { PRComment } from '../../../../../shared/github/comment-types'
import type {
  GitLabCommentResult,
  GitLabDiscussionResolveResult,
  GitLabWorkItemDetails
} from '../../../../../shared/gitlab-types'
import {
  GITLAB_MR_DISCUSSION_MUTATIONS_RUNTIME_CAPABILITY,
  GITLAB_MR_DISCUSSION_MUTATIONS_UPDATE_REQUIRED_MESSAGE
} from '../../../../../shared/protocol-version'
import {
  assertRuntimeEnvironmentCapability,
  callRuntimeRpc,
  getActiveRuntimeTarget
} from '@/runtime/runtime-rpc-client'
import type { ChecksPanelReview } from '../checks-panel-review'

export function isGitLabChecksPanelReview(
  review: ChecksPanelReview | null
): review is ChecksPanelReview & { provider: 'gitlab' } {
  return review?.provider === 'gitlab'
}

export function gitLabMRCommentsToPRComments(
  comments: GitLabWorkItemDetails['comments'] | undefined
): PRComment[] {
  return (comments ?? []).map((comment) => {
    const { reactions: _reactions, ...compatibleComment } = comment
    // Why: the shared comments renderer expects GitHub reaction enums; GitLab award names are open-ended, so omit them here.
    return compatibleComment
  })
}

export async function fetchGitLabMRDetailsForChecks(args: {
  repoPath: string
  repoId?: string
  settings: Parameters<typeof getActiveRuntimeTarget>[0]
  iid: number
  repoOwnerExecutionHostId?: string
}): Promise<GitLabWorkItemDetails | null> {
  const target = getActiveRuntimeTarget(args.settings)
  if (target.kind === 'environment') {
    return callRuntimeRpc<GitLabWorkItemDetails | null>(
      target,
      'gitlab.workItemDetails',
      {
        repo: args.repoId ?? args.repoPath,
        iid: args.iid,
        type: 'mr'
      },
      { timeoutMs: 30_000 }
    )
  }
  return (await window.api.gl.workItemDetails({
    repoPath: args.repoPath,
    repoId: args.repoId,
    repoOwnerExecutionHostId: args.repoOwnerExecutionHostId,
    iid: args.iid,
    type: 'mr'
  })) as GitLabWorkItemDetails | null
}

export async function resolveGitLabMRDiscussionForChecks(args: {
  repoPath: string
  repoId?: string
  settings: Parameters<typeof getActiveRuntimeTarget>[0]
  iid: number
  discussionId: string
  resolved: boolean
}): Promise<GitLabDiscussionResolveResult> {
  const target = getActiveRuntimeTarget(args.settings)
  if (target.kind === 'environment') {
    return callRuntimeRpc<GitLabDiscussionResolveResult>(
      target,
      'gitlab.resolveMRDiscussion',
      {
        repo: args.repoId ?? args.repoPath,
        iid: args.iid,
        discussionId: args.discussionId,
        resolved: args.resolved
      },
      { timeoutMs: 30_000 }
    )
  }
  return window.api.gl.resolveMRDiscussion({
    repoPath: args.repoPath,
    repoId: args.repoId,
    iid: args.iid,
    discussionId: args.discussionId,
    resolved: args.resolved
  })
}

type GitLabChecksMutationArgs = {
  repoPath: string
  repoId?: string
  settings: Parameters<typeof getActiveRuntimeTarget>[0]
  iid: number
}

export async function addGitLabMRCommentForChecks(
  args: GitLabChecksMutationArgs & { body: string }
): Promise<GitLabCommentResult> {
  const target = getActiveRuntimeTarget(args.settings)
  if (target.kind === 'environment') {
    return callRuntimeRpc<GitLabCommentResult>(
      target,
      'gitlab.addMRComment',
      { repo: args.repoId ?? args.repoPath, iid: args.iid, body: args.body },
      { timeoutMs: 30_000 }
    )
  }
  return window.api.gl.addMRComment({
    repoPath: args.repoPath,
    repoId: args.repoId,
    iid: args.iid,
    body: args.body
  })
}

export async function replyGitLabMRDiscussionForChecks(
  args: GitLabChecksMutationArgs & { discussionId: string; body: string }
): Promise<GitLabCommentResult> {
  const target = getActiveRuntimeTarget(args.settings)
  if (target.kind === 'environment') {
    await assertRuntimeEnvironmentCapability(
      target.environmentId,
      GITLAB_MR_DISCUSSION_MUTATIONS_RUNTIME_CAPABILITY,
      GITLAB_MR_DISCUSSION_MUTATIONS_UPDATE_REQUIRED_MESSAGE
    )
    return callRuntimeRpc<GitLabCommentResult>(
      target,
      'gitlab.replyMRDiscussion',
      {
        repo: args.repoId ?? args.repoPath,
        iid: args.iid,
        discussionId: args.discussionId,
        body: args.body
      },
      { timeoutMs: 30_000 }
    )
  }
  return window.api.gl.replyMRDiscussion({
    repoPath: args.repoPath,
    repoId: args.repoId,
    iid: args.iid,
    discussionId: args.discussionId,
    body: args.body
  })
}

export async function deleteGitLabMRCommentForChecks(
  args: GitLabChecksMutationArgs & { noteId: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = getActiveRuntimeTarget(args.settings)
  if (target.kind === 'environment') {
    await assertRuntimeEnvironmentCapability(
      target.environmentId,
      GITLAB_MR_DISCUSSION_MUTATIONS_RUNTIME_CAPABILITY,
      GITLAB_MR_DISCUSSION_MUTATIONS_UPDATE_REQUIRED_MESSAGE
    )
    return callRuntimeRpc<{ ok: true } | { ok: false; error: string }>(
      target,
      'gitlab.deleteMRComment',
      { repo: args.repoId ?? args.repoPath, iid: args.iid, noteId: args.noteId },
      { timeoutMs: 30_000 }
    )
  }
  return window.api.gl.deleteMRComment({
    repoPath: args.repoPath,
    repoId: args.repoId,
    iid: args.iid,
    noteId: args.noteId
  })
}
