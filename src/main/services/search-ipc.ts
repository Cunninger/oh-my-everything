import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import { executeSearch, findEsExe, normalizeSearchSyntax } from './search'
import { getSettings } from './settings'
import { translateQuery } from './ai'
import type { SearchResponse } from '../../shared/types'

export function registerSearchIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SEARCH_RAW, async (_event, syntax: string) => {
    const settings = getSettings()
    return executeSearch({
      syntax,
      maxResults: settings.maxResults,
      esPath: settings.esPath || findEsExe() || '',
    })
  })

  ipcMain.handle(IPC_CHANNELS.SEARCH_TRANSLATE, async (_event, query: string): Promise<SearchResponse> => {
    const startTime = Date.now()
    const settings = getSettings()

    const syntax = normalizeSearchSyntax(await translateQuery(query))
    const esPath = settings.esPath || findEsExe() || ''
    const results = await executeSearch({
      syntax,
      maxResults: settings.maxResults,
      esPath,
    })

    return {
      query,
      syntax,
      results,
      totalResults: results.length,
      executionTimeMs: Date.now() - startTime,
    }
  })
}
