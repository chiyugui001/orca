/**
 * Repro: clicking an Obsidian-style [[note#Heading|alias]] doc link from the
 * rich editor and from markdown preview must open the target in preview mode
 * scrolled to the heading anchor, not parked at the first line.
 */
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import { getActiveWorktreeContext } from './helpers/markdown-editor-fixture'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'

const TARGET_DIRECTORY = '项目/TS30X-V3/设备间通信/协议'
const TARGET_NAME = '帧格式与命令总表'
const TARGET_RELATIVE_PATH = `${TARGET_DIRECTORY}/${TARGET_NAME}`
const HEADING_TEXT = '3.2.1 TYPE 00：查询协议版本'
const HEADING_ANCHOR_ID = '321-type-00查询协议版本'
const FILLER_ANCHOR_ID = 'filler-section-40'

function buildTargetMarkdown(): string {
  const filler = Array.from(
    { length: 80 },
    (_, index) =>
      `### Filler section ${index}\n\nLorem ipsum dolor sit amet ${index} consectetur adipiscing elit.`
  )
  return [...filler, `## ${HEADING_TEXT}`, '', 'Protocol version query body.'].join('\n\n')
}

type DocLinkFixture = {
  sourcePath: string
  sourceRelativePath: string
  targetPath: string
  targetRelativePath: string
}

async function createFixtureFiles(rootPath: string, withSource: boolean): Promise<DocLinkFixture> {
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const targetDirectory = path.join(rootPath, TARGET_DIRECTORY)
  const targetPath = path.join(targetDirectory, `${TARGET_NAME}.md`)
  const sourcePath = path.join(rootPath, `doc-link-anchor-repro-${runId}.md`)

  await mkdir(targetDirectory, { recursive: true })
  await writeFile(targetPath, buildTargetMarkdown(), 'utf8')
  if (withSource) {
    await writeFile(
      sourcePath,
      `Link: [[${TARGET_RELATIVE_PATH}#${HEADING_TEXT}|查询协议版本]]`,
      'utf8'
    )
  }
  return {
    sourcePath,
    sourceRelativePath: path.basename(sourcePath),
    targetPath,
    targetRelativePath: path.posix.join(TARGET_DIRECTORY, `${TARGET_NAME}.md`)
  }
}

async function cleanupFixtureFiles(fixture: DocLinkFixture): Promise<void> {
  // Why: best-effort removal — failures must not mask the navigation assertion.
  await rm(fixture.sourcePath, { force: true }).catch(() => {})
  await rm(fixture.targetPath, { force: true }).catch(() => {})
  await rm(path.join(path.dirname(fixture.targetPath), '..'), {
    recursive: true,
    force: true
  }).catch(() => {})
}

async function openFileInEditMode(
  page: Parameters<typeof getActiveWorktreeContext>[0],
  context: { worktreeId: string },
  filePath: string,
  relativePath: string
): Promise<void> {
  await page.evaluate(
    ({ filePath, relativePath, worktreeId }) => {
      const store = window.__store
      if (!store) {
        throw new Error('window.__store is not available')
      }
      store.getState().openFile({
        filePath,
        relativePath,
        worktreeId,
        language: 'markdown',
        mode: 'edit'
      })
    },
    { filePath, relativePath, worktreeId: context.worktreeId }
  )
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const state = window.__store?.getState()
        const file = state?.openFiles.find((entry) => entry.id === state.activeFileId)
        return file?.filePath ?? null
      })
    )
    .toBe(filePath)
}

async function openMarkdownPreviewWithAnchor(
  page: Parameters<typeof getActiveWorktreeContext>[0],
  context: { worktreeId: string },
  fixture: DocLinkFixture,
  anchor: string
): Promise<void> {
  await page.evaluate(
    ({ fixture, worktreeId, anchor }) => {
      const store = window.__store
      if (!store) {
        throw new Error('window.__store is not available')
      }
      store.getState().openMarkdownPreview(
        {
          filePath: fixture.targetPath,
          relativePath: fixture.targetRelativePath,
          worktreeId,
          language: 'markdown'
        },
        { anchor }
      )
    },
    { fixture, worktreeId: context.worktreeId, anchor }
  )
}

function readPreviewHeadingState(page: Parameters<typeof getActiveWorktreeContext>[0]) {
  return page.evaluate(
    ({ headingIds }) => {
      const container = document.querySelector<HTMLElement>('.markdown-preview')
      const state = window.__store?.getState()
      const activeFile = state?.openFiles.find((entry) => entry.id === state.activeFileId)
      const storeContext = activeFile
        ? `${activeFile.mode}:anchor=${activeFile.markdownPreviewAnchor ?? null}`
        : 'no-active-file'
      if (!container) {
        return { containerPresent: false as const, storeContext }
      }
      const containerRect = container.getBoundingClientRect()
      const headingStates = headingIds.map((headingId) => {
        const heading = document.getElementById(headingId)
        if (!heading) {
          return { headingId, present: false, visible: false, offset: null }
        }
        const headingRect = heading.getBoundingClientRect()
        const offset = headingRect.top - containerRect.top
        return {
          headingId,
          present: true,
          visible:
            headingRect.top >= containerRect.top - 8 && headingRect.top <= containerRect.bottom + 8,
          offset
        }
      })
      return {
        containerPresent: true as const,
        scrollTop: container.scrollTop,
        storeContext,
        headingStates
      }
    },
    { headingIds: [HEADING_ANCHOR_ID, FILLER_ANCHOR_ID] }
  )
}

async function expectHeadingVisibleInPreview(
  page: Parameters<typeof getActiveWorktreeContext>[0],
  headingId: string
): Promise<void> {
  await expect
    .poll(
      async () => {
        const state = await readPreviewHeadingState(page)
        if (!state.containerPresent) {
          return `no-container(${state.storeContext})`
        }
        const heading = state.headingStates.find((entry) => entry.headingId === headingId)
        if (!heading?.present) {
          return `heading-absent(${state.storeContext})`
        }
        return heading.visible
          ? 'visible'
          : `scrolled-past-or-before(offset=${heading.offset},scrollTop=${state.scrollTop},${state.storeContext})`
      },
      { timeout: 20_000, message: `Preview did not scroll to ${headingId}` }
    )
    .toBe('visible')
}

test.describe('Markdown doc-link heading anchor navigation', () => {
  test.beforeEach(async ({ orcaPage }) => {
    await waitForSessionReady(orcaPage)
    await waitForActiveWorktree(orcaPage)
  })

  test('openMarkdownPreview anchor scrolls preview to the heading and re-navigates', async ({
    orcaPage
  }) => {
    const context = await getActiveWorktreeContext(orcaPage)
    const fixture = await createFixtureFiles(context.rootPath, false)
    try {
      // Why: register the edit-mode owner first, exactly like clicking a doc
      // link from a source document that is open in the editor.
      await openFileInEditMode(orcaPage, context, fixture.targetPath, fixture.targetRelativePath)

      await openMarkdownPreviewWithAnchor(orcaPage, context, fixture, HEADING_ANCHOR_ID)
      await expect
        .poll(async () =>
          orcaPage.evaluate(() => {
            const state = window.__store?.getState()
            const file = state?.openFiles.find((entry) => entry.id === state.activeFileId)
            return file ? `${file.mode}:${file.markdownPreviewAnchor ?? null}` : 'no-active-file'
          })
        )
        .toBe(`markdown-preview:${HEADING_ANCHOR_ID}`)

      await expectHeadingVisibleInPreview(orcaPage, HEADING_ANCHOR_ID)

      // Why: repeat navigation into the SAME preview tab with a different
      // anchor is the master-table usage — one preview, many section links.
      await openMarkdownPreviewWithAnchor(orcaPage, context, fixture, FILLER_ANCHOR_ID)
      await expectHeadingVisibleInPreview(orcaPage, FILLER_ANCHOR_ID)
    } finally {
      await cleanupFixtureFiles(fixture)
    }
  })

  test('rich editor doc-link click scrolls preview to the heading', async ({ orcaPage }) => {
    orcaPage.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`))
    const context = await getActiveWorktreeContext(orcaPage)
    const fixture = await createFixtureFiles(context.rootPath, true)
    try {
      await openFileInEditMode(orcaPage, context, fixture.sourcePath, fixture.sourceRelativePath)

      const docLink = orcaPage.locator('.rich-markdown-doc-link').first()
      await expect(docLink).toBeVisible({ timeout: 25_000 })
      // Why: the --missing class is frozen from node-view creation; the click
      // handler resolves against the live index, so click regardless. The
      // hidden e2e window also keeps the node view's box jittering, so use a
      // coordinate mouse click to bypass Playwright's stability gate.
      const box = await docLink.boundingBox()
      expect(box).toBeTruthy()
      await orcaPage.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

      await expectHeadingVisibleInPreview(orcaPage, HEADING_ANCHOR_ID)
    } finally {
      await cleanupFixtureFiles(fixture)
    }
  })

  test('preview doc-link click scrolls preview to the heading', async ({ orcaPage }) => {
    orcaPage.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`))
    const context = await getActiveWorktreeContext(orcaPage)
    const fixture = await createFixtureFiles(context.rootPath, true)
    try {
      await openFileInEditMode(orcaPage, context, fixture.sourcePath, fixture.sourceRelativePath)

      // Why: preview rendering lives on markdown-preview tabs, not the edit
      // tab's view toggle (edit tabs only offer source/rich).
      await orcaPage.evaluate(
        ({ filePath, relativePath, worktreeId }) => {
          window.__store?.getState().openMarkdownPreview(
            {
              filePath,
              relativePath,
              worktreeId,
              language: 'markdown'
            },
            { anchor: null }
          )
        },
        {
          filePath: fixture.sourcePath,
          relativePath: fixture.sourceRelativePath,
          worktreeId: context.worktreeId
        }
      )
      await expect
        .poll(async () =>
          orcaPage.evaluate(() => {
            const state = window.__store?.getState()
            const file = state?.openFiles.find((entry) => entry.id === state.activeFileId)
            return file?.mode === 'markdown-preview' && file.filePath
          })
        )
        .toBe(fixture.sourcePath)

      const docLink = orcaPage.locator('a[class*="markdown-doc-link"]').first()
      await expect(docLink).toBeVisible({ timeout: 25_000 })
      // Why: the hidden e2e window keeps the link's box jittering, so
      // Playwright's stability gate never passes; a coordinate mouse click
      // still delivers a real trusted click to the handler.
      const box = await docLink.boundingBox()
      expect(box).toBeTruthy()
      await orcaPage.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

      await expectHeadingVisibleInPreview(orcaPage, HEADING_ANCHOR_ID)
    } finally {
      await cleanupFixtureFiles(fixture)
    }
  })
})
