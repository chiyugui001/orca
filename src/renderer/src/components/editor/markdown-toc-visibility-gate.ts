import { buildMarkdownTableOfContents, type MarkdownTocItem } from './markdown-table-of-contents'

// Why: the TOC panel is open by default, but the gate still skips the parse
// for files where the user collapsed it, keeping a constant empty-array
// reference (no spurious downstream renders) until the panel actually opens.
const EMPTY_MARKDOWN_TOC: MarkdownTocItem[] = []

/**
 * Why: building the table of contents runs a full-document remark parse on
 * every content change. The result is only consumed when the TOC panel is open,
 * so gate the parse on visibility. Factored out so a vitest can prove the parse
 * is skipped while closed — the failure mode (silent wasted CPU on every
 * keystroke-debounced content change) is otherwise invisible.
 */
export function selectMarkdownTableOfContents(
  showTableOfContents: boolean,
  content: string,
  build: (markdown: string) => MarkdownTocItem[] = buildMarkdownTableOfContents
): MarkdownTocItem[] {
  return showTableOfContents ? build(content) : EMPTY_MARKDOWN_TOC
}
