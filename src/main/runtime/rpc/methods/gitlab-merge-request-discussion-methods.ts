import { z } from 'zod'
import { defineMethod, type RpcMethod } from '../core'
import { requiredString } from '../schemas'

const RepoSelector = z.object({
  repo: requiredString('Missing repo selector')
})

const GitLabProjectRef = z
  .object({
    host: requiredString('Missing GitLab host'),
    path: requiredString('Missing GitLab project path')
  })
  .nullish()

const ResolveMRDiscussion = RepoSelector.extend({
  iid: z.number().int().positive(),
  discussionId: requiredString('Discussion id is required'),
  resolved: z.boolean(),
  projectRef: GitLabProjectRef
})

const ReplyMRDiscussion = RepoSelector.extend({
  iid: z.number().int().positive(),
  discussionId: requiredString('Discussion id is required'),
  body: requiredString('Comment body is required'),
  projectRef: GitLabProjectRef
})

const DeleteMRComment = RepoSelector.extend({
  iid: z.number().int().positive(),
  noteId: z.number().int().positive(),
  projectRef: GitLabProjectRef
})

export const GITLAB_MERGE_REQUEST_DISCUSSION_METHODS: RpcMethod[] = [
  defineMethod({
    name: 'gitlab.resolveMRDiscussion',
    params: ResolveMRDiscussion,
    handler: async (params, { runtime }) =>
      runtime.resolveGitLabRepoMRDiscussion(
        params.repo,
        params.iid,
        params.discussionId,
        params.resolved,
        params.projectRef
      )
  }),
  defineMethod({
    name: 'gitlab.replyMRDiscussion',
    params: ReplyMRDiscussion,
    handler: async (params, { runtime }) =>
      runtime.replyGitLabRepoMRDiscussion(
        params.repo,
        params.iid,
        params.discussionId,
        params.body,
        params.projectRef
      )
  }),
  defineMethod({
    name: 'gitlab.deleteMRComment',
    params: DeleteMRComment,
    handler: async (params, { runtime }) =>
      runtime.deleteGitLabRepoMRComment(params.repo, params.iid, params.noteId, params.projectRef)
  })
]
