import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cleanSearchSyntax, normalizeSearchSyntax, splitSearchSyntax } from '../src/main/services/search-syntax.ts'

describe('cleanSearchSyntax', () => {
  it('removes markdown fences and keeps the final syntax line', () => {
    assert.equal(cleanSearchSyntax('```text\nEverything syntax:\next:pdf dm:today\n```'), 'ext:pdf dm:today')
  })

  it('removes wrapping quotes', () => {
    assert.equal(cleanSearchSyntax('"ext:pdf"'), 'ext:pdf')
  })
})

describe('splitSearchSyntax', () => {
  it('keeps quoted paths together and supports escaped double quotes', () => {
    assert.deepEqual(splitSearchSyntax('"c:\\program files\\" ext:pdf name:""'), [
      'c:\\program files\\',
      'ext:pdf',
      'name:',
    ])
  })
})

describe('normalizeSearchSyntax', () => {
  it('normalizes relative month ranges to fixed dates', () => {
    assert.equal(
      normalizeSearchSyntax('ext:pdf dm:pastmonth', new Date('2026-05-22T12:00:00')),
      'ext:pdf dm:2026-04-22..2026-05-22'
    )
  })
})
