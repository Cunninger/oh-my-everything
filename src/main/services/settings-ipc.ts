import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { getSettings, setSettings } from './settings'

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, settings) => {
    setSettings(settings)
  })
}
