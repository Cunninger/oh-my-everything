import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { explainSearchSyntax, translateWithFallback } from '../src/main/services/fallback-search.ts'

describe('translateWithFallback', () => {
  it('builds useful syntax for common Chinese search intent', () => {
    const result = translateWithFallback('最近 7 天修改的代码文件超过 10MB', new Date('2026-05-22T00:00:00'))

    assert.match(result.syntax, /ext:ts;tsx;js;jsx;py/)
    assert.match(result.syntax, /dm:2026-05-15\.\.2026-05-22/)
    assert.match(result.syntax, /size:>10mb/)
    assert.match(result.explanation, /本地规则/)
  })

  it('keeps raw query when no rule matches', () => {
    const result = translateWithFallback('quarterly budget draft')

    assert.equal(result.syntax, 'quarterly budget draft')
  })
})

describe('explainSearchSyntax', () => {
  it('explains common Everything filters', () => {
    const text = explainSearchSyntax('ext:pdf dm:today size:>5mb', 'ai')

    assert.match(text, /AI/)
    assert.match(text, /pdf/)
    assert.match(text, /修改时间/)
    assert.match(text, /5mb/)
  })
})
