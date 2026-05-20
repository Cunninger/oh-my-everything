export interface SearchResult {
  path: string
  filename: string
  extension: string
  size: number
  dateModified: string
  dateCreated: string
}

export interface SearchResponse {
  query: string
  syntax: string
  results: SearchResult[]
  totalResults: number
  executionTimeMs: number
}

export interface AIProviderConfig {
  provider: 'openai' | 'claude' | 'ollama'
  apiKey?: string
  baseUrl?: string
  model: string
}

export interface AppSettings {
  ai: AIProviderConfig
  esPath: string
  maxResults: number
  showSyntaxPreview: boolean
  theme: 'system' | 'light' | 'dark'
}
