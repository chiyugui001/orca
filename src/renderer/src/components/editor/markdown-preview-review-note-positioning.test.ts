// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import type { DiffComment } from '../../../../shared/diff-comment-types'
import { measureMarkdownPreviewReviewNotePositions } from './markdown-preview-review-note-positioning'

function makeComment(id: string, lineNumber: number): DiffComment {
  return {
    id,
    worktreeId: 'worktree-1',
    filePath: 'notes.md',
    source: 'markdown',
    lineNumber,
    body: 'Review this',
    createdAt: 0,
    side: 'modified'
  }
}

describe('measureMarkdownPreviewReviewNotePositions', () => {
  afterEach(() => document.body.replaceChildren())

  it('anchors cards to their rendered Markdown blocks in the scroll viewport', () => {
    const container = document.createElement('div')
    const body = document.createElement('div')
    const first = document.createElement('div')
    const second = document.createElement('div')
    first.dataset.sourceLine = '1'
    first.dataset.sourceEndLine = '2'
    second.dataset.sourceLine = '3'
    second.dataset.sourceEndLine = '4'
    body.append(first, second)
    container.append(body)
    document.body.append(container)
    Object.defineProperty(container, 'scrollTop', { value: 40 })
    container.getBoundingClientRect = () => DOMRect.fromRect({ y: 100 })
    first.getBoundingClientRect = () => DOMRect.fromRect({ y: 130 })
    second.getBoundingClientRect = () => DOMRect.fromRect({ y: 210 })

    const positions = measureMarkdownPreviewReviewNotePositions({
      body,
      container,
      comments: [makeComment('first', 2), makeComment('second', 4)]
    })

    expect(positions.map(({ comment, top }) => [comment.id, top])).toEqual([
      ['first', 70],
      ['second', 180]
    ])
  })
})
