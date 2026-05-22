export interface FallbackTranslation {
  syntax: string
  explanation: string
}

const EXTENSION_GROUPS: Array<{ keywords: string[], syntax: string, label: string }> = [
  { keywords: ['pdf'], syntax: 'ext:pdf', label: 'PDF 文件' },
  { keywords: ['word', 'doc', '文档'], syntax: 'ext:doc;docx', label: 'Word 文档' },
  { keywords: ['excel', '表格', 'xlsx', 'xls'], syntax: 'ext:xls;xlsx;csv', label: '表格文件' },
  { keywords: ['ppt', 'powerpoint', '演示'], syntax: 'ext:ppt;pptx', label: '演示文稿' },
  { keywords: ['图片', '照片', 'image', 'photo'], syntax: 'pic:', label: '图片' },
  { keywords: ['视频', 'video'], syntax: 'video:', label: '视频' },
  { keywords: ['音频', '音乐', 'audio', 'music'], syntax: 'audio:', label: '音频' },
  { keywords: ['代码', '源码', 'source', 'code'], syntax: 'ext:ts;tsx;js;jsx;py;java;go;rs;cpp;c;h;cs;php;rb;swift;kt', label: '代码文件' },
  { keywords: ['压缩', 'zip', 'rar'], syntax: 'ext:zip;rar;7z;tar;gz', label: '压缩包' },
]

export function translateWithFallback(query: string, now = new Date()): FallbackTranslation {
  const normalized = query.toLowerCase()
  const parts: string[] = []
  const reasons: string[] = []

  for (const group of EXTENSION_GROUPS) {
    if (group.keywords.some(keyword => normalized.includes(keyword))) {
      parts.push(group.syntax)
      reasons.push(`匹配${group.label}`)
      break
    }
  }

  const dateSyntax = inferDateSyntax(normalized, now)
  if (dateSyntax) {
    parts.push(dateSyntax.syntax)
    reasons.push(dateSyntax.reason)
  }

  const sizeSyntax = inferSizeSyntax(normalized)
  if (sizeSyntax) {
    parts.push(sizeSyntax.syntax)
    reasons.push(sizeSyntax.reason)
  }

  const drive = query.match(/\b([a-zA-Z])\s*(?:盘|:)/)
  if (drive) {
    parts.unshift(`${drive[1].toLowerCase()}:\\`)
    reasons.push(`限制在 ${drive[1].toUpperCase()} 盘`)
  }

  const quoted = query.match(/["“”']([^"“”']{2,})["“”']/)
  if (quoted) {
    parts.push(`"${quoted[1].trim()}"`)
    reasons.push('匹配引号中的关键词')
  }

  const syntax = parts.length > 0 ? parts.join(' ') : query.trim()
  return {
    syntax,
    explanation: reasons.length > 0
      ? `本地规则：${reasons.join('，')}。`
      : 'AI 不可用时使用原始关键词进行基础搜索。',
  }
}

export function explainSearchSyntax(syntax: string, translatedBy: 'ai' | 'fallback'): string {
  const reasons: string[] = []
  if (/\bpic:\b/i.test(syntax)) reasons.push('筛选图片')
  if (/\bvideo:\b/i.test(syntax)) reasons.push('筛选视频')
  if (/\baudio:\b/i.test(syntax)) reasons.push('筛选音频')
  if (/\bdoc:\b/i.test(syntax)) reasons.push('筛选文档')

  const ext = syntax.match(/\bext:([^\s]+)/i)
  if (ext) reasons.push(`筛选扩展名 ${ext[1].replace(/;/g, ', ')}`)

  const date = syntax.match(/\b(dm|dc|da):([^\s]+)/i)
  if (date) {
    const label = date[1].toLowerCase() === 'dm' ? '修改时间' : date[1].toLowerCase() === 'dc' ? '创建时间' : '访问时间'
    reasons.push(`${label} ${date[2]}`)
  }

  const size = syntax.match(/\bsize:([^\s]+)/i)
  if (size) reasons.push(`大小 ${size[1]}`)

  const content = syntax.match(/\bcontent:([^\s]+)/i)
  if (content) reasons.push(`内容包含 ${content[1]}`)

  if (reasons.length === 0) {
    return translatedBy === 'ai'
      ? 'AI 已转换为 Everything 基础关键词搜索。'
      : '本地规则使用基础关键词搜索。'
  }

  return `${translatedBy === 'ai' ? 'AI' : '本地规则'}：${reasons.join('，')}。`
}

function inferDateSyntax(query: string, now: Date): { syntax: string, reason: string } | null {
  const field = query.includes('创建') ? 'dc' : query.includes('访问') ? 'da' : 'dm'
  const label = field === 'dc' ? '创建时间' : field === 'da' ? '访问时间' : '修改时间'

  if (query.includes('今天')) return { syntax: `${field}:today`, reason: `${label}为今天` }
  if (query.includes('昨天')) return { syntax: `${field}:yesterday`, reason: `${label}为昨天` }
  if (query.includes('本周') || query.includes('这周')) return { syntax: `${field}:thisweek`, reason: `${label}为本周` }
  if (query.includes('上周')) return { syntax: `${field}:lastweek`, reason: `${label}为上周` }
  if (query.includes('本月') || query.includes('这个月')) return { syntax: `${field}:thismonth`, reason: `${label}为本月` }
  if (query.includes('上月') || query.includes('上个月')) return { syntax: `${field}:lastmonth`, reason: `${label}为上月` }

  const days = query.match(/(?:过去|最近|近)\s*(\d+)\s*天/)
  if (days) return { syntax: `${field}:${formatDate(addDays(now, -Number(days[1])))}..${formatDate(now)}`, reason: `${label}在近 ${days[1]} 天` }

  const months = query.match(/(?:过去|最近|近)\s*(\d+)\s*个?月/)
  if (months) return { syntax: `${field}:past${months[1]}months`, reason: `${label}在近 ${months[1]} 个月` }

  return null
}

function inferSizeSyntax(query: string): { syntax: string, reason: string } | null {
  const over = query.match(/(?:大于|超过|>|>=)\s*(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)/i)
  if (over) return { syntax: `size:>${over[1]}${over[2].toLowerCase()}`, reason: `大于 ${over[1]}${over[2].toUpperCase()}` }

  const under = query.match(/(?:小于|低于|<|<=)\s*(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)/i)
  if (under) return { syntax: `size:<${under[1]}${under[2].toLowerCase()}`, reason: `小于 ${under[1]}${under[2].toUpperCase()}` }

  if (query.includes('大文件')) return { syntax: 'size:>100mb', reason: '匹配大文件' }
  if (query.includes('空文件')) return { syntax: 'size:0', reason: '匹配空文件' }
  return null
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
