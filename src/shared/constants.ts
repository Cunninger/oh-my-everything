import type { AppSettings } from './types'

export const IPC_CHANNELS = {
  SEARCH_TRANSLATE: 'search:translate',
  SEARCH_RAW: 'search:raw',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  APP_OPEN_FILE: 'app:openFile',
  APP_OPEN_FOLDER: 'app:openFolder',
  APP_BROWSE_FILE: 'app:browseFile',
  APP_OPEN_EXTERNAL: 'app:openExternal',
  APP_OPEN_LOGS_FOLDER: 'app:openLogsFolder',
  APP_GET_DIAGNOSTICS: 'app:getDiagnostics',
  APP_EXPORT_SETTINGS: 'app:exportSettings',
  APP_IMPORT_SETTINGS: 'app:importSettings',
  UPDATE_CHECK: 'app:update:check',
  UPDATE_DOWNLOAD: 'app:update:download',
  UPDATE_OPEN_INSTALLER: 'app:update:openInstaller',
  UPDATE_PROGRESS: 'app:update:progress',
  UPDATE_AVAILABLE: 'app:update:available',
  UPDATE_ERROR: 'app:update:error',
  SETTINGS_ONBOARDING_COMPLETE: 'settings:onboardingComplete',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_TOGGLE: 'window:toggle',
} as const

export const SEARCH_LIMITS = {
  minResults: 10,
  maxResults: 1000,
  maxQueryLength: 2000,
} as const

export const APP_REPOSITORY = {
  owner: 'Cunninger',
  repo: 'oh-my-everything',
  latestReleaseApi: 'https://api.github.com/repos/Cunninger/oh-my-everything/releases/latest',
} as const

export const DEFAULT_UPDATE_SETTINGS = {
  autoCheckOnStartup: true,
  proxyEnabled: true,
  proxyTemplate: 'https://gh-proxy.com/{url}',
  preferInstaller: true,
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
  excludePatterns: [],
  updates: { ...DEFAULT_UPDATE_SETTINGS },
  onboardingCompleted: false,
  globalShortcut: 'Ctrl+Alt+Space',
}
