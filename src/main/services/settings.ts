import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import type { AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS, SEARCH_LIMITS } from '../../shared/constants'

interface StoredAISettings {
  provider?: unknown
  apiKey?: unknown
  apiKeyEncrypted?: unknown
  baseUrl?: unknown
  model?: unknown
}

interface StoredSettings {
  ai?: StoredAISettings
  esPath?: unknown
  maxResults?: unknown
  showSyntaxPreview?: unknown
  theme?: unknown
  excludePatterns?: unknown
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

function readConfig(): { settings: AppSettings } {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    return { settings: { ...DEFAULT_SETTINGS } }
  }
  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw) as { settings?: StoredSettings }
    return { settings: normalizeSettings(parsed.settings) }
  } catch {
    return { settings: { ...DEFAULT_SETTINGS } }
  }
}

function writeConfig(data: { settings: AppSettings }): void {
  const configPath = getConfigPath()
  const dir = dirname(configPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(configPath, JSON.stringify({ settings: serializeSettings(data.settings) }, null, 2), 'utf-8')
}

export function getSettings(): AppSettings {
  return readConfig().settings
}

export function setSettings(settings: AppSettings): void {
  writeConfig({ settings: normalizeSettings(settings) })
}

function normalizeSettings(settings?: StoredSettings): AppSettings {
  const ai = settings?.ai || {}
  const provider = normalizeProvider(ai.provider)
  const theme = normalizeTheme(settings?.theme)

  return {
    ai: {
      provider,
      apiKey: normalizeOptionalString(decryptApiKey(ai.apiKeyEncrypted) || ai.apiKey),
      baseUrl: normalizeOptionalString(ai.baseUrl) || getDefaultBaseUrl(provider),
      model: normalizeOptionalString(ai.model) || getDefaultModel(provider),
    },
    esPath: normalizeString(settings?.esPath),
    maxResults: clampNumber(settings?.maxResults, SEARCH_LIMITS.minResults, SEARCH_LIMITS.maxResults, DEFAULT_SETTINGS.maxResults),
    showSyntaxPreview: typeof settings?.showSyntaxPreview === 'boolean'
      ? settings.showSyntaxPreview
      : DEFAULT_SETTINGS.showSyntaxPreview,
    theme,
    excludePatterns: normalizeExcludePatterns(settings?.excludePatterns),
  }
}

function serializeSettings(settings: AppSettings): StoredSettings {
  const apiKeyEncrypted = encryptApiKey(settings.ai.apiKey)
  return {
    ...settings,
    ai: {
      provider: settings.ai.provider,
      ...(apiKeyEncrypted ? { apiKeyEncrypted } : settings.ai.apiKey ? { apiKey: settings.ai.apiKey } : {}),
      ...(settings.ai.baseUrl ? { baseUrl: settings.ai.baseUrl } : {}),
      model: settings.ai.model,
    },
  }
}

function normalizeProvider(value: unknown): AppSettings['ai']['provider'] {
  return value === 'openai' || value === 'claude' || value === 'ollama'
    ? value
    : DEFAULT_SETTINGS.ai.provider
}

function normalizeTheme(value: unknown): AppSettings['theme'] {
  return value === 'system' || value === 'light' || value === 'dark'
    ? value
    : DEFAULT_SETTINGS.theme
}

function getDefaultBaseUrl(provider: AppSettings['ai']['provider']): string | undefined {
  if (provider === 'ollama') return DEFAULT_SETTINGS.ai.baseUrl
  return undefined
}

function getDefaultModel(provider: AppSettings['ai']['provider']): string {
  if (provider === 'openai') return 'gpt-4o-mini'
  if (provider === 'claude') return 'claude-sonnet-4-20250514'
  return DEFAULT_SETTINGS.ai.model
}

function normalizeExcludePatterns(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.excludePatterns]
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(numeric)))
}

function encryptApiKey(apiKey: string | undefined): string | undefined {
  if (!apiKey || !safeStorage.isEncryptionAvailable()) return undefined
  return safeStorage.encryptString(apiKey).toString('base64')
}

function decryptApiKey(value: unknown): string | undefined {
  if (typeof value !== 'string' || !safeStorage.isEncryptionAvailable()) return undefined
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return undefined
  }
}
