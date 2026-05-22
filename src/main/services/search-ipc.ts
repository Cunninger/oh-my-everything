import { ipcMain } from 'electron'
import { IPC_CHANNELS, SEARCH_LIMITS } from '../../shared/constants'
import { cleanSearchSyntax, executeSearch, findEsExe, normalizeSearchSyntax } from './search'
import { getSettings } from './settings'
import { translateQuery } from './ai'
import type { SearchResponse, SearchResult } from '../../shared/types'
import { assertTrustedSender } from './security'
import { explainSearchSyntax, translateWithFallback } from './fallback-search'
import { logWarn } from './logger'
import { recordEvent } from './observability'

export function registerSearchIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SEARCH_RAW, async (event, syntax: string) => {
    assertTrustedSender(event)
    const safeSyntax = validateSearchInput(syntax, 'Everything 语法')
    const settings = getSettings()
    const startTime = Date.now()
    try {
      const results = await executeSearch({
        syntax: safeSyntax,
        maxResults: settings.maxResults,
        esPath: settings.esPath || findEsExe() || '',
        excludePatterns: settings.excludePatterns,
      })
      recordEvent('info', 'search', 'Raw search completed', {
        resultCount: results.length,
        durationMs: Date.now() - startTime,
      })
      return results
    } catch (err) {
      recordEvent('error', 'search', 'Raw search failed', {
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      })
      throw err
    }
  })

  ipcMain.handle(IPC_CHANNELS.SEARCH_TRANSLATE, async (event, query: string): Promise<SearchResponse> => {
    assertTrustedSender(event)
    const startTime = Date.now()
    const safeQuery = validateSearchInput(query, '搜索内容')
    const settings = getSettings()

    let translatedBy: 'ai' | 'fallback' = 'ai'
    let warning: string | undefined
    let syntax = ''
    let explanation = ''

    try {
      syntax = normalizeSearchSyntax(cleanSearchSyntax(await translateQuery(safeQuery)))
      explanation = explainSearchSyntax(syntax, translatedBy)
    } catch (err) {
      translatedBy = 'fallback'
      warning = err instanceof Error ? err.message : String(err)
      recordEvent('warn', 'ai', 'AI translation failed; fallback parser used', { warning })
      logWarn('AI translation failed, using fallback parser', { warning })
      const fallback = translateWithFallback(safeQuery)
      syntax = normalizeSearchSyntax(fallback.syntax)
      explanation = fallback.explanation
    }

    const esPath = settings.esPath || findEsExe() || ''
    let results: SearchResult[]
    try {
      results = await executeSearch({
        syntax,
        maxResults: settings.maxResults,
        esPath,
        excludePatterns: settings.excludePatterns,
      })
      recordEvent('info', 'search', 'Translated search completed', {
        translatedBy,
        resultCount: results.length,
        durationMs: Date.now() - startTime,
        ...(warning ? { warning } : {}),
      })
    } catch (err) {
      recordEvent('error', 'search', 'Translated search failed', {
        translatedBy,
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      })
      throw err
    }

    return {
      query: safeQuery,
      syntax,
      results,
      totalResults: results.length,
      executionTimeMs: Date.now() - startTime,
      translatedBy,
      explanation,
      warning,
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
