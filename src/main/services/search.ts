import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { StringDecoder } from 'string_decoder'
import type { SearchResult } from '../../shared/types'
import { hasDirectoryAttribute, parseCsvOutput } from './search-parser'
import { SEARCH_LIMITS } from '../../shared/constants'
export { cleanSearchSyntax, normalizeSearchSyntax, splitSearchSyntax } from './search-syntax'
import { normalizeSearchSyntax, splitSearchSyntax } from './search-syntax'

export interface SearchOptions {
  syntax: string
  maxResults: number
  esPath: string
  excludePatterns?: string[]
}

export function findEsExe(userPath?: string): string | null {
  // 0. Bundled es.exe shipped with the app
  const bundledPaths: string[] = []
  // Packaged app: extraResources lands under process.resourcesPath
  if (process.resourcesPath) {
    bundledPaths.push(join(process.resourcesPath, 'es', 'es.exe'))
  }
  // Development fallback: project root resources/es
  try {
    bundledPaths.push(join(__dirname, '../../../resources/es/es.exe'))
  } catch { /* ignore */ }

  for (const p of bundledPaths) {
    if (existsSync(p)) return p
  }

  // 1. User-configured path
  if (userPath && existsSync(userPath)) return userPath

  // 2. Registry
  try {
    const installDir = execSync(
      'reg query "HKLM\\SOFTWARE\\Voidtools\\Everything" /v InstallDir 2>nul',
      { encoding: 'utf-8', windowsHide: true }
    )
    const match = installDir.match(/InstallDir\s+REG_SZ\s+(.+)/)
    if (match) {
      for (const name of ['es.exe', 'es64.exe']) {
        const p = join(match[1].trim(), name)
        if (existsSync(p)) return p
      }
    }
  } catch { /* registry key not found */ }

  // 3. Common paths
  const commonPaths = [
    'C:\\Program Files\\Everything\\es.exe',
    'C:\\Program Files\\Everything\\es64.exe',
    'C:\\Program Files (x86)\\Everything\\es.exe',
  ]
  for (const p of commonPaths) {
    if (existsSync(p)) return p
  }

  // 4. Check PATH
  try {
    const which = execSync('where es.exe 2>nul', { encoding: 'utf-8', windowsHide: true })
    const found = which.trim().split('\n')[0]?.trim()
    if (found && existsSync(found)) return found
  } catch { /* not in PATH */ }

  return null
}

export async function executeSearch(options: SearchOptions): Promise<SearchResult[]> {
  const syntax = normalizeSearchSyntax(options.syntax)
  const excludeSuffix = buildExcludeSyntax(options.excludePatterns)
  const finalSyntax = excludeSuffix ? `${syntax} ${excludeSuffix}` : syntax
  const esPath = options.esPath || findEsExe() || ''
  if (!esPath) {
    throw new Error('未找到 es.exe，请从 https://github.com/voidtools/ES/releases 下载 es.exe 并在设置中配置路径')
  }

  if (!existsSync(esPath)) {
    throw new Error(`es.exe 不存在: ${esPath}，请从 https://github.com/voidtools/ES/releases 重新下载`)
  }

  const args = [
    '-n', String(clampMaxResults(options.maxResults)),
    '-cp', '65001',
    '-csv',
    '-name',
    '-path-column',
    '-size',
    '-dm',
    '-dc',
    '-attributes',
    ...splitSearchSyntax(finalSyntax),
  ]

  return new Promise((resolve, reject) => {
    const child = spawn(esPath, args, {
      windowsHide: true,
      timeout: 15000,
    })

    let stdout = ''
    let stderr = ''
    const stdoutDecoder = new StringDecoder('utf8')
    const stderrDecoder = new StringDecoder('utf8')

    child.stdout.on('data', (data: Buffer) => {
      stdout += stdoutDecoder.write(data)
    })

    child.stderr.on('data', (data: Buffer) => {
      stderr += stderrDecoder.write(data)
    })

    child.on('close', (code) => {
      stdout += stdoutDecoder.end()
      stderr += stderrDecoder.end()

      if (code === 2) {
        reject(new Error('Everything 未运行，请先启动 Everything'))
        return
      }
      if (code !== 0 && code !== 1) {
        reject(new Error(`es.exe 退出码 ${code}: ${stderr.trim()}`))
        return
      }

      const results = parseCsvOutput(stdout)
      resolve(results)
    })

    child.on('error', (err) => {
      reject(new Error(`执行 es.exe 失败: ${err.message}`))
    })
  })
}

function clampMaxResults(value: number): number {
  if (!Number.isFinite(value)) return SEARCH_LIMITS.maxResults
  return Math.min(SEARCH_LIMITS.maxResults, Math.max(SEARCH_LIMITS.minResults, Math.trunc(value)))
}

export function isFolder(result: SearchResult): boolean {
  return hasDirectoryAttribute(result.attributes)
}

function buildExcludeSyntax(patterns?: string[]): string {
  if (!patterns || patterns.length === 0) return ''
  return patterns
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => p.endsWith('\\') ? `!${p}` : `!${p}\\`)
    .join(' ')
}
