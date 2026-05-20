import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { executeSearch, findEsExe, normalizeSearchSyntax } from './search'
import { getSettings } from './settings'
import { translateQuery } from './ai'
import type { SearchResponse } from '../../shared/types'

export function registerSearchIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SEARCH_RAW, async (_event, syntax: string) => {
    const settings = getSettings()
    const excludeSuffix = buildExcludeSyntax(settings.excludePatterns)
    const finalSyntax = excludeSuffix ? `${syntax} ${excludeSuffix}` : syntax
    return executeSearch({
      syntax: finalSyntax,
      maxResults: settings.maxResults,
      esPath: settings.esPath || findEsExe() || '',
    })
  })

  ipcMain.handle(IPC_CHANNELS.SEARCH_TRANSLATE, async (_event, query: string): Promise<SearchResponse> => {
    const startTime = Date.now()
    const settings = getSettings()

    const syntax = normalizeSearchSyntax(await translateQuery(query))
    const esPath = settings.esPath || findEsExe() || ''
    const excludeSuffix = buildExcludeSyntax(settings.excludePatterns)
    const finalSyntax = excludeSuffix ? `${syntax} ${excludeSuffix}` : syntax
    const results = await executeSearch({
      syntax: finalSyntax,
      maxResults: settings.maxResults,
      esPath,
    })

    return {
      query,
      syntax: finalSyntax,
      results,
      totalResults: results.length,
      executionTimeMs: Date.now() - startTime,
    }
  })
}

function buildExcludeSyntax(patterns?: string[]): string {
  if (!patterns || patterns.length === 0) return ''
  return patterns
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `!path:*\\${p}\\*`)
    .join(' ')
}
