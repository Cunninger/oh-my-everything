import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, SearchResult, SearchResponse } from '../shared/types'

const api = {
  searchTranslate: (query: string): Promise<SearchResponse> =>
    ipcRenderer.invoke('search:translate', query),

  searchRaw: (syntax: string): Promise<SearchResult[]> =>
    ipcRenderer.invoke('search:raw', syntax),

  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:get'),

  setSettings: (settings: AppSettings): Promise<void> =>
    ipcRenderer.invoke('settings:set', settings),

  openFile: (path: string): Promise<void> =>
    ipcRenderer.invoke('app:openFile', path),

  openFolder: (path: string): Promise<void> =>
    ipcRenderer.invoke('app:openFolder', path),

  minimizeWindow: (): Promise<void> =>
    ipcRenderer.invoke('window:minimize'),

  closeWindow: (): Promise<void> =>
    ipcRenderer.invoke('window:close'),

  browseFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke('app:browseFile', filters),
}

export type ExposedAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
