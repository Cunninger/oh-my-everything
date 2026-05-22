import { app, BrowserWindow, Menu, Tray, globalShortcut, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { registerSearchIpc } from './services/search-ipc'
import { registerSettingsIpc } from './services/settings-ipc'
import { registerUpdateIpc } from './services/update-ipc'
import { bindWindowState, loadWindowState } from './services/window-state'
import { scheduleStartupUpdateCheck } from './services/updater'
import { logInfo } from './services/logger'
import { getSettings } from './services/settings'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

function createWindow(): void {
  const state = loadWindowState()
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    frame: false,
    resizable: true,
    minWidth: 600,
    minHeight: 400,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
  })

  bindWindowState(mainWindow)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  scheduleStartupUpdateCheck(mainWindow)
}

function showMainWindow(): void {
  if (!mainWindow) createWindow()
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function toggleMainWindow(): void {
  if (!mainWindow || !mainWindow.isVisible()) {
    showMainWindow()
    return
  }
  mainWindow.hide()
}

function setupTray(): void {
  if (tray) return
  const iconPath = resolveIconPath()
  tray = new Tray(iconPath)
  tray.setToolTip('oh-my-everything')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示/隐藏', click: toggleMainWindow },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ]))
  tray.on('click', toggleMainWindow)
}

function resolveIconPath(): string {
  const candidates = [
    join(process.resourcesPath || '', 'icon.ico'),
    join(process.resourcesPath || '', 'resources/icon.ico'),
    join(__dirname, '../../resources/icon.ico'),
  ]
  return candidates.find(path => path && existsSync(path)) || join(__dirname, '../../resources/icon.ico')
}

function setupGlobalShortcut(): void {
  const accelerator = getSettings().globalShortcut || 'Ctrl+Alt+Space'
  const ok = globalShortcut.register(accelerator, toggleMainWindow)
  logInfo('Global shortcut registered', { accelerator, ok })
}

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    logInfo('App ready', { version: app.getVersion() })
    electronApp.setAppUserModelId('com.oh-my-everything.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerIpcHandlers(toggleMainWindow)
    registerSearchIpc()
    registerSettingsIpc()
    registerUpdateIpc()

    createWindow()
    setupTray()
    setupGlobalShortcut()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('second-instance', () => {
    if (!mainWindow) {
      createWindow()
      return
    }
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
