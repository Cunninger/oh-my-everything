import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { clearRecentEvents, getRecentEvents, recordEvent } from '../src/main/services/observability.ts'

beforeEach(() => {
  clearRecentEvents()
})

describe('observability events', () => {
  it('stores recent events newest first', () => {
    recordEvent('info', 'search', 'first')
    recordEvent('warn', 'ai', 'second')

    const events = getRecentEvents()
    assert.equal(events[0].message, 'second')
    assert.equal(events[1].message, 'first')
  })

  it('redacts sensitive metadata and caps event count', () => {
    for (let i = 0; i < 60; i++) {
      recordEvent('info', 'app', `event-${i}`, { apiKey: 'secret', index: i })
    }

    const events = getRecentEvents()
    assert.equal(events.length, 50)
    assert.equal(events[0].meta?.apiKey, '[redacted]')
    assert.equal(events[0].meta?.index, 59)
  })
})
