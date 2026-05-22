import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { AppNetworkError, fetchWithTimeout } from '../src/main/services/net.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('fetchWithTimeout', () => {
  it('returns fetch responses', async () => {
    globalThis.fetch = async () => new Response('ok', { status: 200 }) as Response

    const response = await fetchWithTimeout('https://example.test', {}, 100)
    assert.equal(await response.text(), 'ok')
  })

  it('converts aborts to AppNetworkError timeouts', async () => {
    globalThis.fetch = async (_url, init) => {
      await new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
      throw new Error('unreachable')
    }

    await assert.rejects(
      fetchWithTimeout('https://example.test', {}, 1),
      (err) => err instanceof AppNetworkError && err.code === 'timeout'
    )
  })
})
