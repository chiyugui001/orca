import { useMemo } from 'react'
import { getRelativePathInsideRoot, normalizeRelativePath } from '@/lib/path'
import { isMarkdownComment } from '@/lib/diff-comment-compat'
import { sortMarkdownReviewNotes, type MarkdownReviewNote } from '@/lib/markdown-review-notes'
import type { DiffComment } from '../../../../shared/diff-comment-types'

type UseRichMarkdownReviewDataOptions = {
  allDiffComments: DiffComment[] | undefined
  filePath: string
  markdownAnnotationFilePath?: string
  markdownAnnotationsEnabled: boolean
  worktreeRoot: string | null
}

export function useRichMarkdownReviewData({
  allDiffComments,
  filePath,
  markdownAnnotationFilePath,
  markdownAnnotationsEnabled,
  worktreeRoot
}: UseRichMarkdownReviewDataOptions): {
  canAnnotateRichMarkdown: boolean
  markdownComments: DiffComment[]
  markdownReviewNotes: MarkdownReviewNote[]
  sourceRelativePath: string | null
} {
  const sourceRelativePath = useMemo(
    () =>
      markdownAnnotationFilePath
        ? normalizeRelativePath(markdownAnnotationFilePath)
        : getRelativePathInsideRoot(filePath, worktreeRoot),
    [filePath, markdownAnnotationFilePath, worktreeRoot]
  )
  const canAnnotateRichMarkdown = Boolean(markdownAnnotationsEnabled && sourceRelativePath !== null)
  const markdownComments = useMemo(
    () =>
      (allDiffComments ?? []).filter(
        (comment) => comment.filePath === sourceRelativePath && isMarkdownComment(comment)
      ),
    [allDiffComments, sourceRelativePath]
  )
  const markdownReviewNotes = useMemo(
    () => sortMarkdownReviewNotes(markdownComments as MarkdownReviewNote[]),
    [markdownComments]
  )
  return {
    canAnnotateRichMarkdown,
    markdownComments,
    markdownReviewNotes,
    sourceRelativePath
  }
}
