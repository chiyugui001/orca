import { describe, expect, it } from 'vitest'
import { MarkdownHeadingSlugger, slugMarkdownHeading } from './markdown-heading-slug'

describe('markdown heading slugger', () => {
  it('matches GitHub-style punctuation and space handling used by markdown anchors', () => {
    expect(slugMarkdownHeading('A & B')).toBe('a--b')
    expect(slugMarkdownHeading('https://example.com')).toBe('httpsexamplecom')
    expect(slugMarkdownHeading('Keep_under-score')).toBe('keep_under-score')
  })

  it('is idempotent so link fragments carrying an existing slug still resolve', () => {
    expect(slugMarkdownHeading('321-type-00查询协议版本')).toBe('321-type-00查询协议版本')
    expect(slugMarkdownHeading(slugMarkdownHeading('3.2.1 TYPE 00：查询协议版本'))).toBe(
      slugMarkdownHeading('3.2.1 TYPE 00：查询协议版本')
    )
  })

  it('adds stable duplicate suffixes', () => {
    const slugger = new MarkdownHeadingSlugger()

    expect([slugger.slug('Repeat'), slugger.slug('Repeat'), slugger.slug('Repeat')]).toEqual([
      'repeat',
      'repeat-1',
      'repeat-2'
    ])
  })

  it('can reset duplicate state between render passes', () => {
    const slugger = new MarkdownHeadingSlugger()

    expect(slugger.slug('Repeat')).toBe('repeat')
    expect(slugger.slug('Repeat')).toBe('repeat-1')
    slugger.reset()
    expect(slugger.slug('Repeat')).toBe('repeat')
  })
})
