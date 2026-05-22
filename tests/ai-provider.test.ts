import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OpenAIResponseError, parseOpenAIResponse } from '../src/main/ai/openai-response.ts'

describe('parseOpenAIResponse', () => {
  it('reads chat completion content', () => {
    assert.equal(parseOpenAIResponse(JSON.stringify({
      choices: [{ message: { content: 'ext:pdf dm:today' } }],
    })), 'ext:pdf dm:today')
  })

  it('throws typed errors for API-level failures', () => {
    assert.throws(
      () => parseOpenAIResponse(JSON.stringify({ error: { message: 'bad key' } })),
      (err) => err instanceof OpenAIResponseError && err.code === 'http'
    )
  })
})
