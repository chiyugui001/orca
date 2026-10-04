import { defineMethod } from '../core'
import { DeleteMRComment, ReplyMRDiscussion } from '../../../../shared/rpc-contract/gitlab-params'

// Why: upstream owns gitlab.resolveMRDiscussion; these two mutations remain
// fork-specific (reply to a discussion thread, delete an MR note). The array is
// un-annotated so each defineMethod keeps its literal method name for the
// rpc-params-type-parity gate.
export const GITLAB_MERGE_REQUEST_DISCUSSION_METHODS = [
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
