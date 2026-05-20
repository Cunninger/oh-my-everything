import type { AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS, SEARCH_LIMITS } from '../../shared/constants'
import { doSearch } from './search'

const settingsOverlay = document.getElementById('settings-overlay')!
const btnSettings = document.getElementById('btn-settings')!
const btnCloseSettings = document.getElementById('btn-close-settings')!
const btnSaveSettings = document.getElementById('btn-save-settings')!

const setProvider = document.getElementById('set-provider') as HTMLSelectElement
const setApikey = document.getElementById('set-apikey') as HTMLInputElement
const setBaseurl = document.getElementById('set-baseurl') as HTMLInputElement
const setModel = document.getElementById('set-model') as HTMLInputElement
const setEspath = document.getElementById('set-espath') as HTMLInputElement
const setMaxresults = document.getElementById('set-maxresults') as HTMLInputElement
const setExclude = document.getElementById('set-exclude') as HTMLTextAreaElement
const setTheme = document.getElementById('set-theme') as HTMLSelectElement

export function initTheme(): void {
  const saved = localStorage.getItem('theme')
  const theme = saved || 'system'
  applyTheme(theme)
  setTheme.value = theme
}

function applyTheme(theme: string): void {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

function openSettings(): void {
  settingsOverlay.classList.remove('hidden')
  loadSettings()
}

function closeSettings(): void {
  settingsOverlay.classList.add('hidden')
}

async function loadSettings(): Promise<void> {
  try {
    const settings: AppSettings = await window.api.getSettings()
    setProvider.value = settings.ai.provider
    setApikey.value = settings.ai.apiKey || ''
    setBaseurl.value = settings.ai.baseUrl || ''
    setModel.value = settings.ai.model
    setEspath.value = settings.esPath
    setMaxresults.value = String(settings.maxResults)
    setExclude.value = (settings.excludePatterns || []).join('\n')
    syncExcludeTags()
    setTheme.value = settings.theme
  } catch {
    // Use defaults
    setProvider.value = DEFAULT_SETTINGS.ai.provider
    setModel.value = DEFAULT_SETTINGS.ai.model
    setMaxresults.value = String(DEFAULT_SETTINGS.maxResults)
    setTheme.value = DEFAULT_SETTINGS.theme
  }
}

async function saveSettings(): Promise<void> {
  const settings: AppSettings = {
    ai: {
      provider: setProvider.value as 'openai' | 'claude' | 'ollama',
      apiKey: setApikey.value || undefined,
      baseUrl: setBaseurl.value || undefined,
      model: setModel.value,
    },
    esPath: setEspath.value,
    maxResults: clampMaxResults(setMaxresults.value),
    showSyntaxPreview: true,
    theme: setTheme.value as 'system' | 'light' | 'dark',
    excludePatterns: parseExcludePatterns(setExclude.value),
  }

  await window.api.setSettings(settings)
  applyTheme(settings.theme)
  localStorage.setItem('theme', settings.theme)
  closeSettings()
  doSearch()
}

function parseExcludePatterns(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function clampMaxResults(value: string): number {
  const numeric = parseInt(value, 10)
  if (!Number.isFinite(numeric)) return DEFAULT_SETTINGS.maxResults
  return Math.min(SEARCH_LIMITS.maxResults, Math.max(SEARCH_LIMITS.minResults, numeric))
}

// Exclude tag buttons
document.querySelectorAll('.exclude-tag').forEach((btn) => {
  btn.addEventListener('click', () => {
    const value = btn.getAttribute('data-value')!
    const lines = parseExcludePatterns(setExclude.value)
    if (lines.includes(value)) {
      setExclude.value = lines.filter((l) => l !== value).join('\n')
      btn.classList.remove('active')
    } else {
      lines.push(value)
      setExclude.value = lines.join('\n')
      btn.classList.add('active')
    }
  })
})

function syncExcludeTags(): void {
  const lines = parseExcludePatterns(setExclude.value)
  document.querySelectorAll('.exclude-tag').forEach((btn) => {
    const value = btn.getAttribute('data-value')!
    btn.classList.toggle('active', lines.includes(value))
  })
}

setExclude.addEventListener('input', syncExcludeTags)

btnSettings.addEventListener('click', openSettings)
btnCloseSettings.addEventListener('click', closeSettings)
btnSaveSettings.addEventListener('click', saveSettings)

// Browse for es.exe
document.getElementById('btn-browse-es')?.addEventListener('click', async () => {
  const path = await window.api.browseFile([{ name: '可执行文件', extensions: ['exe'] }])
  if (path) setEspath.value = path
})

settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings()
})

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (setTheme.value === 'system') applyTheme('system')
})
