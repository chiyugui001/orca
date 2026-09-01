import type { MRComment } from '../../shared/gitlab-types'
import type { IssueSourcePreference } from '../../shared/repo-types'
import {
  acquire,
  classifyGlabError,
  glabExecFileAsync,
  glabHostnameArgs,
  glabRepoExecOptions,
  release,
  type LocalGitExecOptions,
  type ProjectRef
} from './gl-utils'
import { withProjectRef } from './merge-request-project-resolution'
import { encodedProject } from './project-path-encoding'

type MRCommentMutationResult = { ok: true; comment: MRComment } | { ok: false; error: string }

export async function replyMRDiscussion(
  repoPath: string,
  iid: number,
  discussionId: string,
  body: string,
  preference?: IssueSourcePreference,
  connectionId?: string | null,
  projectRef?: ProjectRef | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<MRCommentMutationResult> {
  return withProjectRef<MRCommentMutationResult>(
    repoPath,
    preference,
    connectionId,
    projectRef,
    async (projectRef) => {
      const id = discussionId.trim()
      const commentBody = body.trim()
      if (!id) {
        return { ok: false, error: 'Discussion id is required' }
      }
      if (!commentBody) {
        return { ok: false, error: 'Comment body is required' }
      }
      await acquire()
      try {
        const { stdout } = await glabExecFileAsync(
          [
            'api',
            ...glabHostnameArgs(projectRef, connectionId),
            '-X',
            'POST',
            `projects/${encodedProject(projectRef.path)}/merge_requests/${iid}/discussions/${encodeURIComponent(id)}/replies`,
            '-f',
            `body=${commentBody}`
          ],
          glabRepoExecOptions(repoPath, connectionId, localGitOptions)
        )
        const data = JSON.parse(stdout) as {
          id?: number
          author?: { username?: string; avatar_url?: string; state?: string } | null
          body?: string
          created_at?: string
        }
        return {
          ok: true,
          comment: {
            id: data.id ?? Date.now(),
            author: data.author?.username ?? 'You',
            authorAvatarUrl: data.author?.avatar_url ?? '',
            body: data.body ?? commentBody,
            createdAt: data.created_at ?? new Date().toISOString(),
            url: '',
            threadId: id,
            isBot: data.author?.state === 'bot'
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { ok: false, error: classifyGlabError(message).message }
      } finally {
        release()
      }
    },
    { ok: false, error: 'Could not resolve GitLab project for this repository' },
    localGitOptions
  )
}

export async function deleteMRComment(
  repoPath: string,
  iid: number,
  noteId: number,
  preference?: IssueSourcePreference,
  connectionId?: string | null,
  projectRef?: ProjectRef | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withProjectRef<{ ok: true } | { ok: false; error: string }>(
    repoPath,
    preference,
    connectionId,
    projectRef,
    async (projectRef) => {
      await acquire()
      try {
        await glabExecFileAsync(
          [
            'api',
            ...glabHostnameArgs(projectRef, connectionId),
            '-X',
            'DELETE',
            `projects/${encodedProject(projectRef.path)}/merge_requests/${iid}/notes/${noteId}`
          ],
          glabRepoExecOptions(repoPath, connectionId, localGitOptions)
        )
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { ok: false, error: classifyGlabError(message).message }
      } finally {
        release()
      }
    },
    { ok: false, error: 'Could not resolve GitLab project for this repository' },
    localGitOptions
  )
}
