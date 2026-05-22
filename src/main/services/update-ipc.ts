import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { checkForUpdates, downloadUpdate, openDownloadedInstaller } from './updater'
import { assertExistingAbsolutePath, assertTrustedSender } from './security'

export function registerUpdateIpc(): void {
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async (event) => {
    assertTrustedSender(event)
    return checkForUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async (event) => {
    assertTrustedSender(event)
    return downloadUpdate(undefined, BrowserWindow.getFocusedWindow() || undefined)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_OPEN_INSTALLER, async (event, filePath?: string) => {
    assertTrustedSender(event)
    await openDownloadedInstaller(filePath ? assertExistingAbsolutePath(filePath, '安装包路径') : undefined)
  })
}
