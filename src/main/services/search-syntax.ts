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
