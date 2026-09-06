import type { OpenFile } from '@/store/slices/editor'
import type { FileContent } from './editor-panel-content-types'
import { extractFrontMatter } from './markdown-frontmatter'

export function getEditorPanelMarkdownState({
  activeFile,
  editorDrafts,
  fileContents,
  isMarkdown,
  markdownViewMode
}: {
  activeFile: OpenFile
  editorDrafts: Record<string, string>
  fileContents: Record<string, FileContent>
  isMarkdown: boolean
  markdownViewMode: 'preview' | 'rich' | 'source' | undefined
}) {
  const documentStateFileId =
    activeFile.mode === 'markdown-preview'
      ? (activeFile.markdownPreviewSourceFileId ?? activeFile.filePath)
      : activeFile.id
  const content =
    activeFile.mode === 'markdown-preview'
      ? (editorDrafts[documentStateFileId] ?? fileContents[activeFile.id]?.content ?? null)
      : activeFile.mode === 'edit'
        ? (editorDrafts[activeFile.id] ?? fileContents[activeFile.id]?.content ?? null)
        : null

  return {
    documentStateFileId,
    content,
    canShowFrontmatterToggle: Boolean(
      isMarkdown &&
        (activeFile.mode === 'markdown-preview' || markdownViewMode !== 'source') &&
        content &&
        extractFrontMatter(content)
    )
  }
}
