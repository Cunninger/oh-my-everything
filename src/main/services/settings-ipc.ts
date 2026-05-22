import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { getSettings, setSettings } from './settings'
import { assertTrustedSender } from './security'

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (event) => {
    assertTrustedSender(event)
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (event, settings) => {
    assertTrustedSender(event)
    setSettings(settings)
  })
}
