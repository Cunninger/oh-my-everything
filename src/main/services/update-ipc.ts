import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { checkForUpdates, downloadUpdate, openDownloadedInstaller } from './updater'

export function registerUpdateIpc(): void {
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
    return checkForUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async () => {
    return downloadUpdate(undefined, BrowserWindow.getFocusedWindow() || undefined)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_OPEN_INSTALLER, async (_event, filePath?: string) => {
    await openDownloadedInstaller(filePath)
  })
}
