import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/constants'

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
    return JSON.parse(raw)
  } catch {
    return { settings: { ...DEFAULT_SETTINGS } }
  }
}

function writeConfig(data: { settings: AppSettings }): void {
  const configPath = getConfigPath()
  const dir = join(configPath, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
}

export function getSettings(): AppSettings {
  return readConfig().settings
}

export function setSettings(settings: AppSettings): void {
  writeConfig({ settings })
}
