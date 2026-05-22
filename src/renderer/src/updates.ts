import type { UpdateCheckResult, UpdateDownloadProgress, UpdateDownloadResult } from '../../shared/types'
import { showDialog, showErrorDialog } from './dialog'

const statusResults = document.getElementById('status-results')!
const updateStatus = document.getElementById('update-status')!
const updateCurrentVersion = document.getElementById('update-current-version')!
const updateProgress = document.getElementById('update-progress')!
const updateProgressBar = document.getElementById('update-progress-bar') as HTMLDivElement
const updateProgressText = document.getElementById('update-progress-text')!
const btnCheckUpdate = document.getElementById('btn-check-update') as HTMLButtonElement
const btnDownloadUpdate = document.getElementById('btn-download-update') as HTMLButtonElement
const btnOpenInstaller = document.getElementById('btn-open-installer') as HTMLButtonElement
const aboutVersion = document.getElementById('about-version')!

let latestUpdate: UpdateCheckResult | null = null
let downloadedUpdate: UpdateDownloadResult | null = null

export function initUpdates(): void {
  window.api.onUpdateAvailable((update) => {
    latestUpdate = update
    renderUpdate(update)
    showDialog('发现新版本', `发现 ${update.latestVersion}，可在设置中下载更新。`)
  })

  window.api.onUpdateError((message) => {
    statusResults.textContent = `自动检查更新失败: ${message}`
  })

  window.api.onUpdateProgress((progress) => {
    renderProgress(progress)
  })

  btnCheckUpdate.addEventListener('click', () => {
    checkForUpdates(false)
  })

  btnDownloadUpdate.addEventListener('click', () => {
    downloadUpdate()
  })

  btnOpenInstaller.addEventListener('click', () => {
    openInstaller()
  })
}

export function setDisplayedVersion(version: string): void {
  updateCurrentVersion.textContent = `当前版本：${version}`
  aboutVersion.textContent = version
}

async function checkForUpdates(silent: boolean): Promise<void> {
  btnCheckUpdate.disabled = true
  updateStatus.textContent = '正在检查更新...'
  try {
    const update = await window.api.checkForUpdates()
    latestUpdate = update
    renderUpdate(update)
    if (!silent && !update.hasUpdate) {
      showDialog('检查更新', `当前已是最新版本：${update.currentVersion}`)
    }
  } catch (err) {
    updateStatus.textContent = '检查更新失败'
    showErrorDialog('检查更新失败', err)
  } finally {
    btnCheckUpdate.disabled = false
  }
}

function renderUpdate(update: UpdateCheckResult): void {
  setDisplayedVersion(update.currentVersion)
  btnDownloadUpdate.classList.toggle('hidden', !update.hasUpdate || !update.asset)
  btnOpenInstaller.classList.add('hidden')
  updateProgress.classList.add('hidden')

  if (!update.hasUpdate) {
    updateStatus.textContent = `当前已是最新版本：${update.currentVersion}`
    return
  }

  if (!update.asset) {
    updateStatus.textContent = `发现 ${update.latestVersion}，但没有可下载的 Windows 安装包`
    return
  }

  updateStatus.textContent = `发现 ${update.latestVersion}: ${update.asset.name} (${formatSize(update.asset.size)})`
}

async function downloadUpdate(): Promise<void> {
  if (!latestUpdate?.asset) return
  btnDownloadUpdate.disabled = true
  updateProgress.classList.remove('hidden')
  updateStatus.textContent = '正在下载更新...'
  try {
    downloadedUpdate = await window.api.downloadUpdate()
    updateStatus.textContent = `下载完成：${downloadedUpdate.fileName} · SHA256 ${downloadedUpdate.sha256.slice(0, 12)}...`
    btnOpenInstaller.classList.remove('hidden')
  } catch (err) {
    updateStatus.textContent = '下载更新失败'
    showErrorDialog('下载更新失败', err)
  } finally {
    btnDownloadUpdate.disabled = false
  }
}

async function openInstaller(): Promise<void> {
  try {
    await window.api.openDownloadedInstaller(downloadedUpdate?.filePath)
  } catch (err) {
    showErrorDialog('打开安装包失败', err)
  }
}

function renderProgress(progress: UpdateDownloadProgress): void {
  updateProgress.classList.remove('hidden')
  updateProgressBar.style.width = `${progress.percent}%`
  updateProgressText.textContent = progress.totalBytes > 0
    ? `${progress.percent}% (${formatSize(progress.receivedBytes)} / ${formatSize(progress.totalBytes)})`
    : formatSize(progress.receivedBytes)
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
