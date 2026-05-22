import type { RuntimeEvent } from '../../shared/types'

const MAX_EVENTS = 50
const events: RuntimeEvent[] = []

export function recordEvent(
  level: RuntimeEvent['level'],
  category: RuntimeEvent['category'],
  message: string,
  meta?: Record<string, unknown>
): void {
  events.unshift({
    time: new Date().toISOString(),
    level,
    category,
    message,
    ...(meta ? { meta: sanitizeMeta(meta) } : {}),
  })
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
}

export function getRecentEvents(): RuntimeEvent[] {
  return events.map(event => ({
    ...event,
    ...(event.meta ? { meta: { ...event.meta } } : {}),
  }))
}

export function clearRecentEvents(): void {
  events.length = 0
}

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(meta)) {
    if (/apikey|api_key|authorization|token|password/i.test(key)) {
      result[key] = '[redacted]'
    } else if (value instanceof Error) {
      result[key] = { name: value.name, message: value.message }
    } else if (typeof value === 'string') {
      result[key] = value.length > 300 ? `${value.slice(0, 300)}...` : value
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      result[key] = value
    } else {
      result[key] = safeJson(value)
    }
  }
  return result
}

function safeJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}
