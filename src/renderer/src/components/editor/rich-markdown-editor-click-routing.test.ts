import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MutableRefObject } from 'react'
import type { EditorView } from '@tiptap/pm/view'
import { handleRichMarkdownEditorClick } from './rich-markdown-editor-click-routing'
import type { HttpLinkSourceOwner } from '@/lib/http-link-routing'

const openHttpLinkMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/http-link-routing', () => ({
  openHttpLink: openHttpLinkMock
}))

beforeEach(() => {
  openHttpLinkMock.mockReset()
})

// Why: the preview deliberately routes differently; this pins the editor side so a
// future "make them consistent" change cannot land silently.
function clickExternalLinkWithShift(sourceOwner: HttpLinkSourceOwner, isMac = true): boolean {
  const href = 'https://example.com/docs'
  const view = {
    state: {
      doc: {
        nodeAt: () => null,
        resolve: () => ({
          marks: () => [{ type: { name: 'link' }, attrs: { href } }]
        })
      }
    }
  } as unknown as EditorView

  return handleRichMarkdownEditorClick({
    activateMarkdownLink: vi.fn(),
    editorRef: { current: {} } as unknown as MutableRefObject<unknown>,
    event: { metaKey: isMac, ctrlKey: !isMac, shiftKey: true } as MouseEvent,
    filePath: '/repo/docs/README.md',
    isMac,
    htmlSuperscriptLinkContext: {
      getSnapshot: () => ({ sourceOwner })
    },
    markdownCommentsRef: { current: [] },
    markdownSourceLineOffsetRef: { current: 0 },
    onOpenDocLinkRef: { current: undefined },
    pos: 1,
    rootRef: { current: null },
    scrollRichMarkdownReviewNoteCardIntoView: vi.fn(),
    settings: {} as never,
    view,
    worktreeId: 'wt-1',
    worktreeRoot: '/repo'
  } as never)
}

describe('rich markdown editor plain click on doc links', () => {
  function plainClickDocLink(nodeAtResult: unknown): {
    handled: boolean
    openDocLink: (target: string) => void
  } {
    const openDocLink = vi.fn()
    const view = {
      state: {
        doc: {
          nodeAt: () => nodeAtResult,
          resolve: () => ({ marks: () => [] })
        }
      }
    } as unknown as EditorView
    const handled = handleRichMarkdownEditorClick({
      activateMarkdownLink: vi.fn(),
      editorRef: { current: {} } as unknown as MutableRefObject<unknown>,
      event: { metaKey: false, ctrlKey: false, shiftKey: false } as MouseEvent,
      filePath: '/repo/docs/README.md',
      isMac: false,
      htmlSuperscriptLinkContext: { getSnapshot: () => ({ sourceOwner: { kind: 'local' } }) },
      markdownCommentsRef: { current: [] },
      markdownSourceLineOffsetRef: { current: 0 },
      onOpenDocLinkRef: { current: openDocLink },
      pos: 1,
      rootRef: { current: null },
      scrollRichMarkdownReviewNoteCardIntoView: vi.fn(),
      settings: {} as never,
      view,
      worktreeId: 'wt-1',
      worktreeRoot: '/repo'
    } as never)
    return { handled, openDocLink }
  }

  it('opens the doc link target on plain click without a modifier', () => {
    const { handled, openDocLink } = plainClickDocLink({
      type: { name: 'markdownDocLink' },
      attrs: { target: 'notes/design.md' }
    })

    expect(handled).toBe(true)
    expect(openDocLink).toHaveBeenCalledWith('notes/design.md')
  })

  it('keeps plain clicks on other content falling through to the editor', () => {
    const { handled, openDocLink } = plainClickDocLink(null)

    expect(handled).toBe(false)
    expect(openDocLink).not.toHaveBeenCalled()
  })
})

describe('rich markdown editor Shift+modifier click on external links', () => {
  // Why: intentionally NOT the preview's behavior — this path hands the link to the
  // client OS, so it must keep forcing the system browser even when inverting is on.
  it('forces the system browser rather than following the invert setting', () => {
    expect(clickExternalLinkWithShift({ kind: 'local' })).toBe(true)
    expect(openHttpLinkMock).toHaveBeenCalledWith('https://example.com/docs', {
      forceSystemBrowser: true,
      sourceOwner: { kind: 'local' }
    })
  })

  // Why: AGENTS.md — Shift+Ctrl is the chord off macOS, and modKey reads a
  // different event field there.
  it('uses the Ctrl chord off macOS', () => {
    expect(clickExternalLinkWithShift({ kind: 'local' }, false)).toBe(true)
    expect(openHttpLinkMock).toHaveBeenCalledWith('https://example.com/docs', {
      forceSystemBrowser: true,
      sourceOwner: { kind: 'local' }
    })
  })

  it('forwards a non-local source owner untouched', () => {
    const sourceOwner = { kind: 'ssh', connectionId: 'conn-1' } as HttpLinkSourceOwner

    expect(clickExternalLinkWithShift(sourceOwner)).toBe(true)
    expect(openHttpLinkMock).toHaveBeenCalledWith(
      'https://example.com/docs',
      expect.objectContaining({ forceSystemBrowser: true, sourceOwner })
    )
  })
})
