import type React from 'react'
import type { MarkdownDocument } from '../../../../shared/filesystem-entry-types'

export type RichMarkdownEditorProps = {
  fileId: string
  viewStateId: string
  content: string
  filePath: string
  worktreeId: string
  externalSshTargetId?: string
  runtimeEnvironmentId?: string | null
  scrollCacheKey: string
  onContentChange: (content: string) => void
  onDirtyStateHint: (dirty: boolean) => void
  onSave: (content: string) => void
  onOpenDocLink?: (target: string) => void
  markdownDocuments?: MarkdownDocument[]
  showTableOfContents?: boolean
  onCloseTableOfContents?: () => void
  markdownAnnotationsEnabled?: boolean
  markdownAnnotationFilePath?: string
  markdownSourceLineOffset?: number
  markdownReviewContent?: string
  // Why: documents with syntax the serializer can't round-trip render in Tiptap
  // read-only — display and annotations stay available, serialization never runs.
  readOnly?: boolean
  // Why: front-matter is stripped from the rich editor's content but we still
  // want it visible to the user. It renders between the toolbar and the editor
  // surface so the formatting toolbar stays at the top of the pane.
  headerSlot?: React.ReactNode
}
