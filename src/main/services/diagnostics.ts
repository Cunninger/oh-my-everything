import { app } from 'electron'
import type { DiagnosticInfo } from '../../shared/types'
import { getSettings } from './settings'
import { findEsExe } from './search'
import { getLogsPath } from './logger'
import { getRecentEvents } from './observability'

export function getDiagnostics(): DiagnosticInfo {
  const settings = getSettings()
  const esPath = settings.esPath || findEsExe() || ''
  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron || '',
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    appPath: app.getAppPath(),
    userDataPath: app.getPath('userData'),
    logsPath: getLogsPath(),
    esPath,
    esFound: Boolean(esPath),
    settings: {
      aiProvider: settings.ai.provider,
      aiModel: settings.ai.model,
      hasApiKey: Boolean(settings.ai.apiKey),
      maxResults: settings.maxResults,
      theme: settings.theme,
      excludePatternCount: settings.excludePatterns.length,
      updates: settings.updates,
    },
    recentEvents: getRecentEvents(),
  }
}

export function formatDiagnostics(info = getDiagnostics()): string {
  return [
    `oh-my-everything ${info.appVersion}`,
    `Electron: ${info.electronVersion}`,
    `Node: ${info.nodeVersion}`,
    `Platform: ${info.platform} ${info.arch}`,
    `App path: ${info.appPath}`,
    `User data: ${info.userDataPath}`,
    `Logs: ${info.logsPath}`,
    `ES path: ${info.esPath || '(not found)'}`,
    `ES found: ${info.esFound}`,
    `AI: ${info.settings.aiProvider} / ${info.settings.aiModel} / apiKey=${info.settings.hasApiKey ? 'yes' : 'no'}`,
    `Max results: ${info.settings.maxResults}`,
    `Theme: ${info.settings.theme}`,
    `Exclude patterns: ${info.settings.excludePatternCount}`,
    `Updates: auto=${info.settings.updates.autoCheckOnStartup}, proxy=${info.settings.updates.proxyEnabled}, preferInstaller=${info.settings.updates.preferInstaller}`,
    '',
    'Recent events:',
    ...info.recentEvents.slice(0, 10).map(event => {
      const meta = event.meta ? ` ${JSON.stringify(event.meta)}` : ''
      return `- ${event.time} [${event.level}/${event.category}] ${event.message}${meta}`
    }),
  ].join('\n')
}
