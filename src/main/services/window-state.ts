import type { BrowserWindow } from 'electron'
import { app, screen } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { logWarn } from './logger'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
}

const DEFAULT_STATE: WindowState = {
  width: 900,
  height: 600,
}

export function loadWindowState(): WindowState {
  const path = getWindowStatePath()
  if (!existsSync(path)) return DEFAULT_STATE
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as WindowState
    if (!isUsableState(parsed)) return DEFAULT_STATE
    return parsed
  } catch (err) {
    logWarn('Failed to load window state', err)
    return DEFAULT_STATE
  }
}

export function bindWindowState(win: BrowserWindow): void {
  const save = (): void => saveWindowState(win)
  win.on('resize', save)
  win.on('move', save)
  win.on('close', save)
}

function saveWindowState(win: BrowserWindow): void {
  if (win.isMinimized()) return
  const bounds = win.getBounds()
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: Math.max(bounds.width, 600),
    height: Math.max(bounds.height, 400),
  }
  try {
    const path = getWindowStatePath()
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    logWarn('Failed to save window state', err)
  }
}

function getWindowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function isUsableState(state: WindowState): boolean {
  if (!Number.isFinite(state.width) || !Number.isFinite(state.height)) return false
  if (state.width < 600 || state.height < 400) return false
  if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) return true

  const windowRect = {
    x: state.x as number,
    y: state.y as number,
    width: state.width,
    height: state.height,
  }
  return screen.getAllDisplays().some(display => {
    const area = display.workArea
    return windowRect.x < area.x + area.width &&
      windowRect.x + windowRect.width > area.x &&
      windowRect.y < area.y + area.height &&
      windowRect.y + windowRect.height > area.y
  })
}
