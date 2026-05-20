import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import type {
  AppSettings,
  DiagnosticInfo,
  ExposedAPI,
  SearchResult,
  SearchResponse,
  UpdateCheckResult,
  UpdateDownloadProgress,
  UpdateDownloadResult,
} from '../shared/types'

const api: ExposedAPI = {
  searchTranslate: (query: string): Promise<SearchResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_TRANSLATE, query),

  searchRaw: (syntax: string): Promise<SearchResult[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_RAW, syntax),

  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

  setSettings: (settings: AppSettings): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),

  exportSettings: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_EXPORT_SETTINGS),

  importSettings: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_IMPORT_SETTINGS),

  openFile: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_FILE, path),

  openFolder: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_FOLDER, path),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),

  openLogsFolder: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_LOGS_FOLDER),

  getDiagnostics: (): Promise<{ info: DiagnosticInfo, text: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_GET_DIAGNOSTICS),

  checkForUpdates: (): Promise<UpdateCheckResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),

  downloadUpdate: (): Promise<UpdateDownloadResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD),

  openDownloadedInstaller: (filePath?: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_OPEN_INSTALLER, filePath),

  onUpdateProgress: (callback: (progress: UpdateDownloadProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: UpdateDownloadProgress): void => callback(progress)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_PROGRESS, listener)
  },

  onUpdateAvailable: (callback: (update: UpdateCheckResult) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, update: UpdateCheckResult): void => callback(update)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, listener)
  },

  onUpdateError: (callback: (message: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string): void => callback(message)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_ERROR, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_ERROR, listener)
  },

  minimizeWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),

  closeWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),

  browseFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_BROWSE_FILE, filters),
}

contextBridge.exposeInMainWorld('api', api)
