import { ipcMain, shell, BrowserWindow, dialog } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FILE, async (_event, path: string) => {
    await shell.openPath(path)
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FOLDER, async (_event, path: string) => {
    shell.showItemInFolder(path)
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
