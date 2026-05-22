export interface SearchResult {
  path: string
  filename: string
  extension: string
  size: number
  dateModified: string
  dateCreated: string
  attributes: string
}

export interface SearchResponse {
  query: string
  syntax: string
  results: SearchResult[]
  totalResults: number
  executionTimeMs: number
  translatedBy: 'ai' | 'fallback'
  explanation: string
  warning?: string
}

export interface AIProviderConfig {
  provider: 'openai' | 'claude' | 'ollama'
  apiKey?: string
  baseUrl?: string
  model: string
}

export interface UpdateSettings {
  autoCheckOnStartup: boolean
  proxyEnabled: boolean
  proxyTemplate: string
  preferInstaller: boolean
}

export interface AppSettings {
  ai: AIProviderConfig
  esPath: string
  maxResults: number
  showSyntaxPreview: boolean
  theme: 'system' | 'light' | 'dark'
  excludePatterns: string[]
  updates: UpdateSettings
  onboardingCompleted: boolean
  globalShortcut: string
}

export interface UpdateAsset {
  name: string
  size: number
  url: string
  proxiedUrl: string
  kind: 'installer' | 'portable'
}

export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseName: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
  asset: UpdateAsset | null
}

export interface UpdateDownloadResult {
  filePath: string
  fileName: string
  size: number
  sha256: string
}

export interface UpdateDownloadProgress {
  receivedBytes: number
  totalBytes: number
  percent: number
}

export interface RuntimeEvent {
  time: string
  level: 'info' | 'warn' | 'error'
  category: 'app' | 'search' | 'ai' | 'update' | 'security'
  message: string
  meta?: Record<string, unknown>
}

export interface DiagnosticInfo {
  appVersion: string
  electronVersion: string
  nodeVersion: string
  platform: string
  arch: string
  appPath: string
  userDataPath: string
  logsPath: string
  esPath: string
  esFound: boolean
  settings: {
    aiProvider: AIProviderConfig['provider']
    aiModel: string
    hasApiKey: boolean
    maxResults: number
    theme: AppSettings['theme']
    excludePatternCount: number
    updates: UpdateSettings
  }
  recentEvents: RuntimeEvent[]
}

export interface ExposedAPI {
  searchTranslate(query: string): Promise<SearchResponse>
  searchRaw(syntax: string): Promise<SearchResult[]>
  getSettings(): Promise<AppSettings>
  setSettings(settings: AppSettings): Promise<void>
  exportSettings(): Promise<string | null>
  importSettings(): Promise<string | null>
  openFile(path: string): Promise<void>
  openFolder(path: string): Promise<void>
  openExternal(url: string): Promise<void>
  openLogsFolder(): Promise<void>
  getDiagnostics(): Promise<{ info: DiagnosticInfo, text: string }>
  checkForUpdates(): Promise<UpdateCheckResult>
  downloadUpdate(): Promise<UpdateDownloadResult>
  openDownloadedInstaller(filePath?: string): Promise<void>
  markOnboardingCompleted(): Promise<void>
  toggleWindow(): Promise<void>
  onUpdateProgress(callback: (progress: UpdateDownloadProgress) => void): () => void
  onUpdateAvailable(callback: (update: UpdateCheckResult) => void): () => void
  onUpdateError(callback: (message: string) => void): () => void
  minimizeWindow(): Promise<void>
  closeWindow(): Promise<void>
  browseFile(filters?: { name: string, extensions: string[] }[]): Promise<string | null>
}
