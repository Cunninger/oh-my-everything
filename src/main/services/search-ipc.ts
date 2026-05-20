import { ipcMain } from 'electron'
import { IPC_CHANNELS, SEARCH_LIMITS } from '../../shared/constants'
import { cleanSearchSyntax, executeSearch, findEsExe, normalizeSearchSyntax } from './search'
import { getSettings } from './settings'
import { translateQuery } from './ai'
import type { SearchResponse } from '../../shared/types'

export function registerSearchIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SEARCH_RAW, async (_event, syntax: string) => {
    const safeSyntax = validateSearchInput(syntax, 'Everything 语法')
    const settings = getSettings()
    return executeSearch({
      syntax: safeSyntax,
      maxResults: settings.maxResults,
      esPath: settings.esPath || findEsExe() || '',
      excludePatterns: settings.excludePatterns,
    })
  })

  ipcMain.handle(IPC_CHANNELS.SEARCH_TRANSLATE, async (_event, query: string): Promise<SearchResponse> => {
    const startTime = Date.now()
    const safeQuery = validateSearchInput(query, '搜索内容')
    const settings = getSettings()

    const syntax = normalizeSearchSyntax(cleanSearchSyntax(await translateQuery(safeQuery)))
    const esPath = settings.esPath || findEsExe() || ''
    const results = await executeSearch({
      syntax,
      maxResults: settings.maxResults,
      esPath,
      excludePatterns: settings.excludePatterns,
    })

    return {
      query: safeQuery,
      syntax,
      results,
      totalResults: results.length,
      executionTimeMs: Date.now() - startTime,
    }
  })
}

function validateSearchInput(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label}必须是字符串`)
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label}不能为空`)
  if (trimmed.length > SEARCH_LIMITS.maxQueryLength) {
    throw new Error(`${label}过长，请控制在 ${SEARCH_LIMITS.maxQueryLength} 个字符以内`)
  }
  return trimmed
}
