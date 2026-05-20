import { ipcMain, shell, BrowserWindow, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../shared/constants'
import { formatDiagnostics, getDiagnostics } from './services/diagnostics'
import { getLogsPath } from './services/logger'
import { getExportableSettings, setSettings } from './services/settings'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FILE, async (_event, path: string) => {
    await shell.openPath(path)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FOLDER, async (_event, path: string) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_event, url: string) => {
    if (!/^https?:\/\//i.test(url)) throw new Error('只能打开 http/https 链接')
    await shell.openExternal(url)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_LOGS_FOLDER, async () => {
    await shell.openPath(getLogsPath())
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_DIAGNOSTICS, async () => {
    return { info: getDiagnostics(), text: formatDiagnostics() }
  })

  ipcMain.handle(IPC_CHANNELS.APP_EXPORT_SETTINGS, async () => {
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

  ipcMain.handle(IPC_CHANNELS.APP_IMPORT_SETTINGS, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: '导入设置',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const raw = readFileSync(result.filePaths[0], 'utf-8')
    const parsed = JSON.parse(raw) as { settings?: unknown }
    setSettings(parsed.settings || parsed)
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.APP_BROWSE_FILE, async (_event, filters?: { name: string; extensions: string[] }[]) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters || [{ name: '可执行文件', extensions: ['exe'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.close()
  })
}
