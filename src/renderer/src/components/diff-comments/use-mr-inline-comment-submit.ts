import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { useMountedRef } from '@/hooks/useMountedRef'

// Encapsulates GitLab MR inline-comment submission so the large diff-viewer
// files don't carry MR plumbing (they sit at the oxlint max-lines ceiling).
// Reads the active worktree's linked MR + repo from the store, fetches the
// MR's diff_refs, and posts via addMRInlineComment with a nested JSON position.
//
// Line-side rule: only new_line is sent (the popover is anchored on the
// modified-side editor). This attaches to added AND modified lines. Pure
// unchanged-context lines are not supported (GitLab requires old_line+new_line
// there, which needs diff-side mapping that doesn't fit the viewer budget).
export function useMRInlineCommentSubmit(
  lineNumber: number,
  filePath: string | undefined
): {
  hasMRContext: boolean
  mrSubmitting: boolean
  submitToMR: (body: string) => Promise<boolean>
} {
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const linkedGitLabMR = useAppStore((s) => {
    if (!activeWorktreeId) {
      return null
    }
    for (const wtList of Object.values(s.worktreesByRepo ?? {})) {
      const wt = wtList?.find((w) => w.id === activeWorktreeId)
      if (wt) {
        return wt.linkedGitLabMR ?? null
      }
    }
    for (const result of Object.values(s.detectedWorktreesByRepo ?? {})) {
      const wt = result?.worktrees?.find((w) => w.id === activeWorktreeId)
      if (wt) {
        return wt.linkedGitLabMR ?? null
      }
    }
    return null
  })
  const repoId = useAppStore((s) => {
    if (!activeWorktreeId) {
      return null
    }
    for (const wtList of Object.values(s.worktreesByRepo ?? {})) {
      const wt = wtList?.find((w) => w.id === activeWorktreeId)
      if (wt) {
        return wt.repoId ?? null
      }
    }
    return null
  })
  const repoPath = useAppStore((s) => {
    if (!repoId) {
      return null
    }
    return s.repos.find((r) => r.id === repoId)?.path ?? null
  })
  const mountedRef = useMountedRef()
  const [mrSubmitting, setMrSubmitting] = useState(false)
  const hasMRContext = Boolean(linkedGitLabMR && repoPath && filePath)

  const submitToMR = useCallback(
    async (body: string): Promise<boolean> => {
      if (mrSubmitting) {
        return false
      }
      if (!linkedGitLabMR || !repoPath) {
        toast.error('No GitLab MR linked to this worktree.')
        return false
      }
      if (!filePath) {
        toast.error('No file path to anchor the inline comment.')
        return false
      }
      setMrSubmitting(true)
      try {
        const detailsResult = await window.api.gl.workItemDetails({
          repoPath,
          repoId: repoId ?? '',
          type: 'mr',
          iid: linkedGitLabMR
        })
        const baseSha = detailsResult?.baseSha
        const startSha = detailsResult?.startSha
        const headSha = detailsResult?.headSha
        if (!baseSha || !startSha || !headSha) {
          toast.error('Could not load MR diff references (base/start/head SHA).')
          return false
        }
        const inlineResult = await window.api.gl.addMRInlineComment({
          repoPath,
          repoId: repoId ?? '',
          iid: linkedGitLabMR,
          input: {
            body,
            path: filePath,
            line: lineNumber,
            baseSha,
            startSha,
            headSha
          }
        })
        if (inlineResult.ok) {
          toast.success('Inline comment posted to MR.')
          return true
        }
        // Why: surface the real GitLab error (e.g. 422 position invalid) instead
        // of silently degrading to a non-inline MR note that lands on no line.
        toast.error(inlineResult.error || 'Failed to post inline comment to MR.')
        return false
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to post comment.')
        return false
      } finally {
        if (mountedRef.current) {
          setMrSubmitting(false)
        }
      }
    },
    [filePath, linkedGitLabMR, lineNumber, mrSubmitting, repoId, repoPath]
  )

  return { hasMRContext, mrSubmitting, submitToMR }
}
