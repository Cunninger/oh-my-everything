export interface ParsedSearchResult {
  path: string
  filename: string
  extension: string
  size: number
  dateModified: string
  dateCreated: string
  attributes: string
}

export function parseCsvOutput(csv: string): ParsedSearchResult[] {
  const lines = csv.trim().split(/\r?\n/).filter(l => l.length > 0)
  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0]).map(part => part.trim().toLowerCase())
  if (header[0] === 'name' && header[1] === 'path') {
    return lines.slice(1).map(line => {
      const parts = parseCsvLine(line)
      const filename = parts[0] || ''
      const parentPath = parts[1] || ''
      const fullPath = joinResultPath(parentPath, filename)
      const ext = getExtension(filename)
      const size = parseNumber(parts[2])
      const dateModified = parts[3] || ''
      const dateCreated = parts[4] || ''
      const attributes = parts[5] || ''

      return { path: fullPath, filename, extension: ext, size, dateModified, dateCreated, attributes }
    })
  }

  // Older layouts use a single full-path Filename column.
  const startIdx = header[0] === 'filename' ? 1 : 0
  return lines.slice(startIdx).map(line => {
    const parts = parseCsvLine(line)
    const fullPath = parts[0] || line
    const filename = getFilenameFromPath(fullPath)
    const ext = getExtension(filename)
    const size = parseNumber(parts[1])
    const dateModified = parts[2] || ''
    const dateCreated = parts[3] || ''
    const attributes = parts[4] || ''

    return { path: fullPath, filename, extension: ext, size, dateModified, dateCreated, attributes }
  })
}

export function hasDirectoryAttribute(attributes: string): boolean {
  const numericAttributes = Number(attributes)
  if (Number.isFinite(numericAttributes)) {
    return (numericAttributes & 16) !== 0
  }
  return attributes.includes('D')
}

function joinResultPath(parentPath: string, filename: string): string {
  if (!parentPath) return filename
  if (!filename) return parentPath
  if (parentPath.endsWith('\\') || parentPath.endsWith('/')) return `${parentPath}${filename}`
  return `${parentPath}\\${filename}`
}

function getFilenameFromPath(fullPath: string): string {
  const pathWithoutTrailingSeparator = fullPath.replace(/[\\/]+$/, '')
  const normalizedPath = pathWithoutTrailingSeparator || fullPath
  const lastSep = Math.max(normalizedPath.lastIndexOf('\\'), normalizedPath.lastIndexOf('/'))
  return lastSep >= 0 ? normalizedPath.substring(lastSep + 1) : normalizedPath
}

function getExtension(filename: string): string {
  return filename.includes('.') ? filename.substring(filename.lastIndexOf('.') + 1) : ''
}

function parseNumber(value: string | undefined): number {
  const parsed = value ? parseInt(value, 10) : 0
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}
