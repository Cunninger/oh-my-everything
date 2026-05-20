import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { StringDecoder } from 'string_decoder'
import type { SearchResult } from '../../shared/types'
import { hasDirectoryAttribute, parseCsvOutput } from './search-parser'
import { SEARCH_LIMITS } from '../../shared/constants'

export interface SearchOptions {
  syntax: string
  maxResults: number
  esPath: string
  excludePatterns?: string[]
}

export function cleanSearchSyntax(output: string): string {
  let syntax = output.trim()
  const fencedMatch = syntax.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/)
  if (fencedMatch) {
    syntax = fencedMatch[1].trim()
  }

  const lines = syntax
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('```'))

  syntax = lines.length > 1 ? lines[lines.length - 1] : (lines[0] || syntax)
  syntax = syntax.replace(/^`+|`+$/g, '').trim()

  const quote = syntax[0]
  if ((quote === '"' || quote === "'") && syntax.endsWith(quote)) {
    syntax = syntax.slice(1, -1).trim()
  }

  return syntax
}

export function normalizeSearchSyntax(syntax: string, now = new Date()): string {
  return syntax
    .replace(/\b(dm|dc|da|rc):pastmonth\b/gi, (_match, field: string) => {
      return `${field}:${formatDate(subtractMonths(now, 1))}..${formatDate(now)}`
    })
    .replace(
      /\b(dm|dc|da|rc):past(\d+)(year|month|week|hour|minute|min|second|sec)s?\b/gi,
      (_match, field: string, amountText: string, unit: string) => {
        const amount = Number(amountText)
        if (!Number.isFinite(amount) || amount <= 0) return _match

        if (unit === 'year') return `${field}:${formatDate(subtractMonths(now, amount * 12))}..${formatDate(now)}`
        if (unit === 'month') return `${field}:${formatDate(subtractMonths(now, amount))}..${formatDate(now)}`
        if (unit === 'week') return `${field}:${formatDate(addDays(now, -amount * 7))}..${formatDate(now)}`

        const pluralUnit = unit.endsWith('s') ? unit : `${unit}s`
        return `${field}:past${amount}${pluralUnit}`
      }
    )
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const originalDay = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() - months)
  result.setDate(Math.min(originalDay, daysInMonth(result.getFullYear(), result.getMonth())))
  return result
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function splitSearchSyntax(syntax: string): string[] {
  const args: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < syntax.length; i++) {
    const ch = syntax[i]

    if (ch === '"') {
      if (inQuotes && syntax[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && /\s/.test(ch)) {
      if (current) {
        args.push(current)
        current = ''
      }
      continue
    }

    current += ch
  }

  if (current) args.push(current)
  return args
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
