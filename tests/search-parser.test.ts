import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hasDirectoryAttribute, parseCsvOutput } from '../src/main/services/search-parser.ts'

describe('parseCsvOutput', () => {
  it('parses the Name and Path layout without dropping folder names', () => {
    const results = parseCsvOutput([
      'Name,Path,Size,Date Modified,Date Created,Attributes',
      '"MyZero","D:\\Projects\\GitHub\\cunninger\\HumanizeAI",0,2026/5/17 23:28:17,2026/4/21 21:22:16,16',
      '"2026-04-21-myzero-implementation.md","D:\\Projects\\GitHub\\cunninger\\HumanizeAI\\MyZero\\docs",70094,2026/4/21 22:08:44,2026/4/21 22:08:44,32',
    ].join('\n'))

    assert.equal(results[0].filename, 'MyZero')
    assert.equal(results[0].path, 'D:\\Projects\\GitHub\\cunninger\\HumanizeAI\\MyZero')
    assert.equal(results[0].attributes, '16')
    assert.equal(results[1].extension, 'md')
    assert.equal(results[1].size, 70094)
  })

  it('parses old full-path Filename layout with trailing folder separators', () => {
    const results = parseCsvOutput([
      'Filename,Size,Date Modified,Date Created,Attributes',
      '"D:\\Projects\\GitHub\\cunninger\\HumanizeAI\\MyZero\\",0,2026/5/17 23:28:17,2026/4/21 21:22:16,16',
    ].join('\n'))

    assert.equal(results[0].filename, 'MyZero')
    assert.equal(results[0].path, 'D:\\Projects\\GitHub\\cunninger\\HumanizeAI\\MyZero\\')
  })

  it('handles CSV quoting for commas, quotes, spaces, and non-ASCII names', () => {
    const results = parseCsvOutput([
      'Name,Path,Size,Date Modified,Date Created,Attributes',
      '"report, ""final"" 中文.pdf","C:\\Users\\Example\\My Documents",123,2026/5/20 12:00:00,2026/5/20 11:00:00,32',
    ].join('\n'))

    assert.equal(results[0].filename, 'report, "final" 中文.pdf')
    assert.equal(results[0].path, 'C:\\Users\\Example\\My Documents\\report, "final" 中文.pdf')
    assert.equal(results[0].extension, 'pdf')
  })
})

describe('hasDirectoryAttribute', () => {
  it('supports Everything numeric attributes', () => {
    assert.equal(hasDirectoryAttribute('16'), true)
    assert.equal(hasDirectoryAttribute('17'), true)
    assert.equal(hasDirectoryAttribute('32'), false)
  })

  it('supports legacy letter attributes', () => {
    assert.equal(hasDirectoryAttribute('D'), true)
    assert.equal(hasDirectoryAttribute('A'), false)
  })
})
