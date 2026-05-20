import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

const MAX_LOG_BYTES = 1024 * 1024
const MAX_ARCHIVES = 3

export function getLogsPath(): string {
  return app.getPath('logs')
}

export function logInfo(message: string, meta?: unknown): void {
  writeLog('info', message, meta)
}

export function logWarn(message: string, meta?: unknown): void {
  writeLog('warn', message, meta)
}

export function logError(message: string, meta?: unknown): void {
  writeLog('error', message, meta)
}

function writeLog(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
  try {
    const dir = getLogsPath()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const file = join(dir, 'app.log')
    rotateIfNeeded(file)

    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      ...(meta === undefined ? {} : { meta: sanitizeMeta(meta) }),
    }
    appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf-8')
  } catch {
    // Logging must never break app behavior.
  }
}

function rotateIfNeeded(file: string): void {
  if (!existsSync(file)) return
  if (statSync(file).size < MAX_LOG_BYTES) return

  const dir = getLogsPath()
  const archive = join(dir, `app-${formatTimestamp(new Date())}.log`)
  try {
    const content = statSync(file)
    if (content.size > 0) {
      // Rename can fail if another process briefly holds the log; ignore and continue app flow.
      renameSync(file, archive)
    }
  } catch {
    return
  }

  const archives = readdirSync(dir)
    .filter(name => /^app-\d{8}-\d{6}\.log$/.test(name))
    .map(name => ({ name, path: join(dir, name), mtime: statSync(join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const old of archives.slice(MAX_ARCHIVES)) {
    try {
      unlinkSync(old.path)
    } catch { /* ignore */ }
  }
}

function sanitizeMeta(meta: unknown): unknown {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack }
  }
  if (typeof meta !== 'object' || meta === null) return meta
  return JSON.parse(JSON.stringify(meta, (key, value) => {
    if (/apikey|api_key|authorization|token|password/i.test(key)) return '[redacted]'
    return value
  }))
}

function formatTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}
