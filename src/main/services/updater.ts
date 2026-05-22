import { app, BrowserWindow, shell } from 'electron'
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { createHash } from 'crypto'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { APP_REPOSITORY, IPC_CHANNELS } from '../../shared/constants'
import type { UpdateCheckResult, UpdateDownloadProgress, UpdateDownloadResult } from '../../shared/types'
import { getSettings } from './settings'
import { logError, logInfo, logWarn } from './logger'
import { toUpdateCheckResult, type GitHubRelease } from './update-core'
import { fetchWithTimeout } from './net'
import { recordEvent } from './observability'

let lastCheck: UpdateCheckResult | null = null
let lastDownload: UpdateDownloadResult | null = null

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const settings = getSettings()
  logInfo('Checking for updates', { currentVersion: app.getVersion(), proxyEnabled: settings.updates.proxyEnabled })

  let response: Response
  try {
    response = await fetchWithTimeout(APP_REPOSITORY.latestReleaseApi, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': `oh-my-everything/${app.getVersion()}`,
      },
    }, 12000)
  } catch (err) {
    logError('Update check network failure', err)
    recordEvent('error', 'update', 'Update check network failure', {
      message: err instanceof Error ? err.message : String(err),
    })
    throw new Error(`检查更新失败: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    const text = await response.text()
    logWarn('Update check failed', { status: response.status, body: text.slice(0, 300) })
    recordEvent('warn', 'update', 'Update check failed', { status: response.status })
    throw new Error(`检查更新失败 (${response.status}): ${text.slice(0, 200)}`)
  }

  const release = await response.json() as GitHubRelease
  const result = toUpdateCheckResult(release, app.getVersion(), settings.updates)
  lastCheck = result
  logInfo('Update check completed', {
    latestVersion: result.latestVersion,
    hasUpdate: result.hasUpdate,
    asset: result.asset?.name,
  })
  recordEvent('info', 'update', 'Update check completed', {
    latestVersion: result.latestVersion,
    hasUpdate: result.hasUpdate,
    asset: result.asset?.name || '',
  })
  return result
}

export async function downloadUpdate(
  update: UpdateCheckResult | null = lastCheck,
  win = BrowserWindow.getFocusedWindow()
): Promise<UpdateDownloadResult> {
  if (!update?.asset) throw new Error('没有可下载的更新资产')

  const downloadsDir = app.getPath('downloads')
  const filePath = join(downloadsDir, update.asset.name)
  const downloadUrl = update.asset.proxiedUrl
  logInfo('Downloading update', { fileName: update.asset.name, downloadUrl })

  if (!existsSync(dirname(filePath))) mkdirSync(dirname(filePath), { recursive: true })

  let response: Response
  try {
    response = await fetchWithTimeout(downloadUrl, {}, 10 * 60 * 1000)
  } catch (err) {
    logError('Update download network failure', err)
    recordEvent('error', 'update', 'Update download network failure', {
      fileName: update.asset.name,
      message: err instanceof Error ? err.message : String(err),
    })
    throw new Error(`下载更新失败: ${err instanceof Error ? err.message : String(err)}。可在设置中关闭代理后重试。`)
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    logWarn('Update download failed', { status: response.status, body: text.slice(0, 300) })
    recordEvent('warn', 'update', 'Update download failed', {
      fileName: update.asset.name,
      status: response.status,
    })
    throw new Error(`下载更新失败 (${response.status})。可在设置中关闭代理后重试。`)
  }

  const totalBytes = Number(response.headers.get('content-length')) || update.asset.size || 0
  let receivedBytes = 0
  const downloadStream = Readable.fromWeb(response.body as unknown as import('stream/web').ReadableStream<Uint8Array>)
  downloadStream.on('data', (chunk: Buffer) => {
    receivedBytes += chunk.byteLength
    const progress: UpdateDownloadProgress = {
      receivedBytes,
      totalBytes,
      percent: totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0,
    }
    win?.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, progress)
  })

  await pipeline(
    downloadStream,
    createWriteStream(filePath)
  )

  lastDownload = {
    filePath,
    fileName: update.asset.name,
    size: receivedBytes || update.asset.size,
    sha256: await sha256File(filePath),
  }
  logInfo('Update download completed', lastDownload)
  recordEvent('info', 'update', 'Update download completed', {
    fileName: lastDownload.fileName,
    size: lastDownload.size,
    sha256: lastDownload.sha256,
  })
  return lastDownload
}

export async function openDownloadedInstaller(filePath?: string): Promise<void> {
  const target = filePath || lastDownload?.filePath
  if (!target) throw new Error('没有已下载的安装包')
  const result = await shell.openPath(target)
  if (result) throw new Error(result)
  logInfo('Opened downloaded installer', { filePath: target })
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  await pipeline(createReadStream(filePath), hash)
  return hash.digest('hex')
}

export function scheduleStartupUpdateCheck(win: BrowserWindow): void {
  const settings = getSettings()
  if (!settings.updates.autoCheckOnStartup) return
  setTimeout(() => {
    checkForUpdates()
      .then(result => {
        if (result.hasUpdate) {
          win.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, result)
        }
      })
      .catch(err => {
        win.webContents.send(IPC_CHANNELS.UPDATE_ERROR, err instanceof Error ? err.message : String(err))
      })
  }, 4000)
}
