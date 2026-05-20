import './search'
import './results'
import './syntax-preview'
import './settings-panel'
import { initTheme } from './settings-panel'

declare global {
  interface Window {
    api: import('../../shared/types').ExposedAPI
  }
}

// Window control buttons
document.getElementById('btn-minimize')?.addEventListener('click', () => {
  window.api.minimizeWindow()
})

document.getElementById('btn-close')?.addEventListener('click', () => {
  window.api.closeWindow()
})

// Initialize theme
initTheme()
