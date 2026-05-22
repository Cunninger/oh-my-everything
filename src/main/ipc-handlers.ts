import { ipcMain, shell, BrowserWindow, dialog } from 'electron'
import { readFileSync, statSync, writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../shared/constants'
import { formatDiagnostics, getDiagnostics } from './services/diagnostics'
import { getLogsPath } from './services/logger'
import { getExportableSettings, markOnboardingCompleted, setSettings } from './services/settings'
import { assertExistingAbsolutePath, assertHttpUrl, assertTrustedSender } from './services/security'

export function registerIpcHandlers(toggleWindow?: () => void): void {
  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FILE, async (event, path: string) => {
    assertTrustedSender(event)
    const target = assertExistingAbsolutePath(path)
    await shell.openPath(target)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FOLDER, async (event, path: string) => {
    assertTrustedSender(event)
    const target = assertExistingAbsolutePath(path)
    shell.showItemInFolder(target)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (event, url: string) => {
    assertTrustedSender(event)
    await shell.openExternal(assertHttpUrl(url))
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_LOGS_FOLDER, async (event) => {
    assertTrustedSender(event)
    await shell.openPath(getLogsPath())
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_DIAGNOSTICS, async (event) => {
    assertTrustedSender(event)
    return { info: getDiagnostics(), text: formatDiagnostics() }
  })

  ipcMain.handle(IPC_CHANNELS.APP_EXPORT_SETTINGS, async (event) => {
    assertTrustedSender(event)
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      title: '导出设置',
      defaultPath: 'oh-my-everything-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return null
    writeFileSync(result.filePath, JSON.stringify({ settings: getExportableSettings() }, null, 2), 'utf-8')
    return result.filePath
  })

  ipcMain.handle(IPC_CHANNELS.APP_IMPORT_SETTINGS, async (event) => {
    assertTrustedSender(event)
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: '导入设置',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    if (statSync(result.filePaths[0]).size > 1024 * 1024) {
      throw new Error('设置文件过大，请选择 1MB 以内的 JSON 文件')
    }
    const raw = readFileSync(result.filePaths[0], 'utf-8')
    const parsed = JSON.parse(raw) as { settings?: unknown }
    setSettings(parsed.settings || parsed)
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.APP_BROWSE_FILE, async (event, filters?: { name: string; extensions: string[] }[]) => {
    assertTrustedSender(event)
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters || [{ name: '可执行文件', extensions: ['exe'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_ONBOARDING_COMPLETE, async (event) => {
    assertTrustedSender(event)
    markOnboardingCompleted()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async (event) => {
    assertTrustedSender(event)
    const win = BrowserWindow.getFocusedWindow()
    win?.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async (event) => {
    assertTrustedSender(event)
    const win = BrowserWindow.getFocusedWindow()
    win?.close()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE, async (event) => {
    assertTrustedSender(event)
    toggleWindow?.()
  })
}
