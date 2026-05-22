import { app, type IpcMainInvokeEvent } from 'electron'
import { existsSync } from 'fs'
import { isAbsolute, normalize } from 'path'

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url || event.sender.getURL()
  if (isTrustedRendererUrl(url)) return
  throw new Error('拒绝来自非应用页面的请求')
}

export function isTrustedRendererUrl(url: string): boolean {
  if (!url) return false
  if (url.startsWith('file://')) return true

  if (!app.isPackaged) {
    try {
      const parsed = new URL(url)
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    } catch {
      return false
    }
  }

  return false
}

export function assertExistingAbsolutePath(value: unknown, label = '路径'): string {
  if (typeof value !== 'string') throw new Error(`${label}必须是字符串`)
  const trimmed = value.trim()
  if (!trimmed || !isAbsolute(trimmed)) throw new Error(`${label}必须是绝对路径`)
  const normalized = normalize(trimmed)
  if (!existsSync(normalized)) throw new Error(`${label}不存在: ${normalized}`)
  return normalized
}

export function assertHttpUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('链接必须是字符串')
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('只能打开 http/https 链接')
  }
  return url.toString()
}
