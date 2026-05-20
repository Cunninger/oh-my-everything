import type { AppSettings } from './types'

export const IPC_CHANNELS = {
  SEARCH_TRANSLATE: 'search:translate',
  SEARCH_RAW: 'search:raw',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  APP_OPEN_FILE: 'app:openFile',
  APP_OPEN_FOLDER: 'app:openFolder',
  APP_BROWSE_FILE: 'app:browseFile',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_CLOSE: 'window:close',
} as const

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    provider: 'ollama',
    model: 'llama3',
    baseUrl: 'http://localhost:11434',
  },
  esPath: '',
  maxResults: 100,
  showSyntaxPreview: true,
  theme: 'system',
}
