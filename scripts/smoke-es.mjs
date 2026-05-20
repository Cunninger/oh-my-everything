import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const esPath = resolve('resources/es/es.exe')

if (!existsSync(esPath)) {
  throw new Error(`Bundled es.exe not found: ${esPath}`)
}

await runCase('folders', ['folder:'], result => {
  assert.ok(result.rows.length > 0, 'Expected at least one folder result')
  assert.ok(result.rows.every(row => row[0]), 'Folder result names must not be empty')
  assert.ok(result.rows.some(row => hasDirectoryAttribute(row[5])), 'Expected a directory attribute in folder results')
})

await runCase('files', ['file:'], result => {
  assert.ok(result.rows.length > 0, 'Expected at least one file result')
  assert.ok(result.rows.every(row => row[0]), 'File result names must not be empty')
  assert.ok(result.rows.some(row => !hasDirectoryAttribute(row[5])), 'Expected a non-directory attribute in file results')
})

console.log('ES smoke checks passed')

async function runCase(name, query, validate) {
  const args = [
    '-n', '20',
    '-cp', '65001',
    '-csv',
    '-name',
    '-path-column',
    '-size',
    '-dm',
    '-dc',
    '-attributes',
    ...query,
  ]

  const { stdout, stderr } = await execFileAsync(esPath, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15000,
  })

  if (stderr.trim()) {
    throw new Error(`${name} smoke check wrote stderr: ${stderr.trim()}`)
  }

  const rows = stdout.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine)
  assert.deepEqual(rows[0], ['Name', 'Path', 'Size', 'Date Modified', 'Date Created', 'Attributes'])
  validate({ rows: rows.slice(1) })
}

function hasDirectoryAttribute(attributes) {
  const numericAttributes = Number(attributes)
  if (Number.isFinite(numericAttributes)) return (numericAttributes & 16) !== 0
  return String(attributes).includes('D')
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  result.push(current)
  return result
}
