import type { SearchResponse, SearchResult } from '../../shared/types'
import { showErrorDialog } from './dialog'

interface SearchRecord {
  query: string
  syntax: string
  favorite: boolean
  updatedAt: number
}

const searchInput = document.getElementById('search-input') as HTMLInputElement
const searchBtn = document.getElementById('btn-search') as HTMLButtonElement
const statusResults = document.getElementById('status-results')!
const resultsBody = document.getElementById('results-body')!
const resultsEmpty = document.getElementById('results-empty')!
const resultsLoading = document.getElementById('results-loading')!
const syntaxInput = document.getElementById('syntax-input') as HTMLInputElement
const syntaxPreview = document.getElementById('syntax-preview')!
const explanationBox = document.getElementById('search-explanation')!
const favoriteBtn = document.getElementById('btn-favorite-search') as HTMLButtonElement
const memoryWrap = document.getElementById('search-memory')!
const favoritesSection = document.getElementById('favorites-section')!
const historySection = document.getElementById('history-section')!
const favoritesList = document.getElementById('favorites-list')!
const historyList = document.getElementById('history-list')!

let currentResults: SearchResult[] = []
let currentRenderedResults: SearchResult[] = []
let currentQuery = ''
let currentSyntax = ''
let sortField: 'size' | 'date' | 'type' | null = null
let sortAsc = true
let latestSearchId = 0
let selectedIndex = -1

export function setLoading(loading: boolean): void {
  resultsLoading.classList.toggle('hidden', !loading)
  searchBtn.disabled = loading
  const label = searchBtn.querySelector('.btn-label') as HTMLSpanElement
  const spinner = searchBtn.querySelector('.btn-spinner') as HTMLSpanElement
  if (label) label.classList.toggle('hidden', loading)
  if (spinner) spinner.classList.toggle('hidden', !loading)
}

export function showError(message: string): void {
  statusResults.textContent = message
  statusResults.classList.add('error-message')
}

export function clearError(): void {
  statusResults.classList.remove('error-message')
}

export async function doSearch(): Promise<void> {
  await runQuery(searchInput.value.trim())
}

async function runQuery(query: string): Promise<void> {
  if (!query) return

  const searchId = ++latestSearchId
  currentQuery = query
  setLoading(true)
  clearError()
  resetResults()

  try {
    const response: SearchResponse = await window.api.searchTranslate(query)
    if (searchId !== latestSearchId) return

    currentSyntax = response.syntax
    syntaxInput.value = response.syntax
    syntaxPreview.classList.remove('hidden')
    renderExplanation(response)
    applyResults(response.results)
    upsertHistory(response.query, response.syntax)

    const mode = response.translatedBy === 'fallback' ? '本地规则' : 'AI'
    statusResults.textContent = `${response.results.length} 条结果 (${(response.executionTimeMs / 1000).toFixed(1)}s) · ${mode}`
  } catch (err: unknown) {
    if (searchId !== latestSearchId) return
    const message = `搜索失败: ${err instanceof Error ? err.message : String(err)}`
    showError(message)
    showErrorDialog('搜索失败', err)
  } finally {
    if (searchId === latestSearchId) setLoading(false)
  }
}

export async function rerunWithSyntax(): Promise<void> {
  const syntax = syntaxInput.value.trim()
  if (!syntax) return

  const searchId = ++latestSearchId
  currentSyntax = syntax
  currentQuery = searchInput.value.trim() || syntax
  setLoading(true)
  clearError()
  resetResults()

  try {
    const results = await window.api.searchRaw(syntax)
    if (searchId !== latestSearchId) return
    applyResults(results)
    explanationBox.textContent = '手动执行当前 Everything 语法。'
    explanationBox.classList.remove('hidden')
    upsertHistory(currentQuery, syntax)
    statusResults.textContent = `${results.length} 条结果`
  } catch (err: unknown) {
    if (searchId !== latestSearchId) return
    showError(`搜索失败: ${err instanceof Error ? err.message : String(err)}`)
    showErrorDialog('搜索失败', err)
  } finally {
    if (searchId === latestSearchId) setLoading(false)
  }
}

function resetResults(): void {
  currentResults = []
  currentRenderedResults = []
  selectedIndex = -1
  resultsBody.innerHTML = ''
  resultsEmpty.classList.add('hidden')
  explanationBox.classList.add('hidden')
}

function applyResults(results: SearchResult[]): void {
  currentResults = results
  if (results.length === 0) {
    resultsEmpty.classList.remove('hidden')
    return
  }
  resultsEmpty.classList.add('hidden')
  renderResults(sortResults(currentResults, sortField, sortAsc))
  selectResult(0)
}

function renderExplanation(response: SearchResponse): void {
  const text = response.warning
    ? `${response.explanation} AI 请求失败，已自动降级：${response.warning}`
    : response.explanation
  explanationBox.textContent = text
  explanationBox.classList.toggle('hidden', text.trim().length === 0)
}

function sortResults(results: SearchResult[], field: 'size' | 'date' | 'type' | null, asc: boolean): SearchResult[] {
  if (!field) return results
  const sorted = [...results]
  sorted.sort((a, b) => {
    let cmp = 0
    if (field === 'size') {
      cmp = a.size - b.size
    } else if (field === 'date') {
      cmp = new Date(a.dateModified).getTime() - new Date(b.dateModified).getTime()
    } else if (field === 'type') {
      const aDir = isDirectory(a) ? 1 : 0
      const bDir = isDirectory(b) ? 1 : 0
      cmp = aDir - bDir
    }
    return asc ? cmp : -cmp
  })
  return sorted
}

function updateSortIndicators(): void {
  document.querySelectorAll('#results-table th[data-sort]').forEach((th) => {
    th.classList.remove('sort-asc', 'sort-desc')
    const f = th.getAttribute('data-sort') as 'size' | 'date' | 'type'
    if (f === sortField) {
      th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc')
    }
  })
}

function fileIcon(isDir: boolean): string {
  if (isDir) {
    return `<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>`
  }
  return `<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>`
}

function renderResults(results: SearchResult[]): void {
  currentRenderedResults = results
  resultsBody.innerHTML = ''
  const fragment = document.createDocumentFragment()
  results.forEach((r, index) => {
    const isDir = isDirectory(r)
    const tr = document.createElement('tr')
    tr.dataset.path = r.path
    tr.dataset.index = String(index)

    tr.innerHTML = `
      <td title="${escapeHtml(r.filename)}" class="col-name-cell">${fileIcon(isDir)}<span class="filename-text">${escapeHtml(r.filename)}</span></td>
      <td title="${escapeHtml(r.path)}">${escapeHtml(r.path)}</td>
      <td>${isDir ? '--' : formatSize(r.size)}</td>
      <td>${escapeHtml(r.dateModified)}</td>
    `

    tr.addEventListener('click', () => selectResult(index))
    tr.addEventListener('dblclick', () => openResult(r.path))
    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      selectResult(index)
      showContextMenu(e, r.path)
    })

    fragment.appendChild(tr)
  })
  resultsBody.appendChild(fragment)
  updateFavoriteButton()
}

function selectResult(index: number): void {
  if (currentRenderedResults.length === 0) {
    selectedIndex = -1
    return
  }
  selectedIndex = Math.max(0, Math.min(index, currentRenderedResults.length - 1))
  document.querySelectorAll('#results-table tbody tr').forEach((row) => {
    row.classList.toggle('selected', Number((row as HTMLTableRowElement).dataset.index) === selectedIndex)
  })
  const selected = document.querySelector(`#results-table tbody tr[data-index="${selectedIndex}"]`) as HTMLTableRowElement | null
  selected?.scrollIntoView({ block: 'nearest' })
}

function openSelectedResult(): void {
  const result = currentRenderedResults[selectedIndex]
  if (result) openResult(result.path)
}

function openResult(path: string): void {
  window.api.openFile(path).catch((err) => showErrorDialog('打开文件失败', err))
}

function isDirectory(result: SearchResult): boolean {
  const numericAttributes = Number(result.attributes)
  if (Number.isFinite(numericAttributes)) {
    return (numericAttributes & 16) !== 0
  }
  return result.attributes.includes('D') || result.path.endsWith('\\') || result.path.endsWith('/')
}

function showContextMenu(e: MouseEvent, filePath: string): void {
  document.querySelectorAll('.context-menu').forEach(el => el.remove())

  const menu = document.createElement('div')
  menu.className = 'context-menu'
  menu.style.left = `${e.clientX}px`
  menu.style.top = `${e.clientY}px`

  const items = [
    { label: '打开文件', action: () => openResult(filePath) },
    { label: '打开所在文件夹', action: () => window.api.openFolder(filePath) },
    { label: '复制路径', action: () => navigator.clipboard.writeText(filePath) },
  ]

  for (const item of items) {
    const div = document.createElement('div')
    div.className = 'context-menu-item'
    div.textContent = item.label
    div.addEventListener('click', () => {
      item.action()
      menu.remove()
    })
    menu.appendChild(div)
  }

  document.body.appendChild(menu)

  const close = (e: MouseEvent): void => {
    if (!(e.target as HTMLElement).closest('.context-menu')) {
      menu.remove()
      document.removeEventListener('click', close)
    }
  }
  setTimeout(() => document.addEventListener('click', close), 0)
}

function loadHistory(): SearchRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('search-history') || '[]') as SearchRecord[]
    return Array.isArray(parsed) ? parsed.filter(isSearchRecord).slice(0, 20) : []
  } catch {
    return []
  }
}

function saveHistory(records: SearchRecord[]): void {
  localStorage.setItem('search-history', JSON.stringify(records.slice(0, 20)))
  renderSearchMemory()
}

function upsertHistory(query: string, syntax: string): void {
  const records = loadHistory()
  const existing = records.find(record => record.query === query && record.syntax === syntax)
  const next: SearchRecord = {
    query,
    syntax,
    favorite: existing?.favorite || false,
    updatedAt: Date.now(),
  }
  saveHistory([next, ...records.filter(record => !(record.query === query && record.syntax === syntax))])
  updateFavoriteButton()
}

function toggleFavorite(): void {
  if (!currentQuery || !currentSyntax) return
  const records = loadHistory()
  const existing = records.find(record => record.query === currentQuery && record.syntax === currentSyntax)
  const nextFavorite = !existing?.favorite
  const next: SearchRecord = {
    query: currentQuery,
    syntax: currentSyntax,
    favorite: nextFavorite,
    updatedAt: Date.now(),
  }
  saveHistory([next, ...records.filter(record => !(record.query === currentQuery && record.syntax === currentSyntax))])
  updateFavoriteButton()
}

function updateFavoriteButton(): void {
  const current = loadHistory().find(record => record.query === currentQuery && record.syntax === currentSyntax)
  favoriteBtn.textContent = current?.favorite ? '已收藏' : '收藏'
}

function renderSearchMemory(): void {
  const records = loadHistory()
  const favorites = records.filter(record => record.favorite).slice(0, 6)
  const recent = records.filter(record => !record.favorite).slice(0, 6)

  renderMemoryList(favoritesList, favorites)
  renderMemoryList(historyList, recent)
  favoritesSection.classList.toggle('hidden', favorites.length === 0)
  historySection.classList.toggle('hidden', recent.length === 0)
  memoryWrap.classList.toggle('hidden', favorites.length === 0 && recent.length === 0)
}

function renderMemoryList(target: HTMLElement, records: SearchRecord[]): void {
  target.innerHTML = ''
  for (const record of records) {
    const btn = document.createElement('button')
    btn.className = 'memory-chip'
    btn.textContent = record.query
    btn.title = record.syntax
    btn.addEventListener('click', () => {
      searchInput.value = record.query
      syntaxInput.value = record.syntax
      runQuery(record.query)
    })
    target.appendChild(btn)
  }
}

function isSearchRecord(value: unknown): value is SearchRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as SearchRecord
  return typeof record.query === 'string' &&
    typeof record.syntax === 'string' &&
    typeof record.favorite === 'boolean' &&
    typeof record.updatedAt === 'number'
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

searchBtn.addEventListener('click', doSearch)
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch()
})

favoriteBtn.addEventListener('click', toggleFavorite)

document.querySelectorAll('.quick-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const query = chip.getAttribute('data-query') || ''
    searchInput.value = query
    runQuery(query)
  })
})

document.querySelectorAll('#results-table th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => {
    const field = th.getAttribute('data-sort') as 'size' | 'date' | 'type'
    if (sortField === field) {
      sortAsc = !sortAsc
    } else {
      sortField = field
      sortAsc = true
    }
    updateSortIndicators()
    renderResults(sortResults(currentResults, sortField, sortAsc))
    selectResult(0)
  })
})

document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement
  const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
  if (isTyping && target !== searchInput) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectResult(selectedIndex + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectResult(selectedIndex - 1)
  } else if (e.key === 'Enter' && target !== searchInput) {
    e.preventDefault()
    openSelectedResult()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
    e.preventDefault()
    searchInput.focus()
    searchInput.select()
  }
})

renderSearchMemory()
searchInput.focus()
