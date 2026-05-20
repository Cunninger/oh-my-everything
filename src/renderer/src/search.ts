import type { SearchResponse, SearchResult } from '../../shared/types'

const searchInput = document.getElementById('search-input') as HTMLInputElement
const searchBtn = document.getElementById('btn-search') as HTMLButtonElement
const statusResults = document.getElementById('status-results')!
const resultsBody = document.getElementById('results-body')!
const resultsEmpty = document.getElementById('results-empty')!
const resultsLoading = document.getElementById('results-loading')!

let currentResults: SearchResult[] = []
let sortField: 'size' | 'date' | 'type' | null = null
let sortAsc = true

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
  const query = searchInput.value.trim()
  if (!query) return

  setLoading(true)
  clearError()
  resultsBody.innerHTML = ''
  resultsEmpty.classList.add('hidden')

  try {
    const response: SearchResponse = await window.api.searchTranslate(query)

    // Update syntax preview
    const syntaxInput = document.getElementById('syntax-input') as HTMLInputElement
    syntaxInput.value = response.syntax
    document.getElementById('syntax-preview')!.classList.remove('hidden')

    // Update results
    currentResults = response.results
    if (response.results.length === 0) {
      resultsEmpty.classList.remove('hidden')
    } else {
      resultsEmpty.classList.add('hidden')
      renderResults(sortResults(currentResults, sortField, sortAsc))
    }

    statusResults.textContent = `${response.results.length} 条结果 (${(response.executionTimeMs / 1000).toFixed(1)}s)`
  } catch (err: unknown) {
    showError(`搜索失败: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    setLoading(false)
  }
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
      const aDir = a.attributes.includes('D') ? 1 : 0
      const bDir = b.attributes.includes('D') ? 1 : 0
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
  resultsBody.innerHTML = ''
  const fragment = document.createDocumentFragment()
  for (const r of results) {
    const isDir = r.attributes.includes('D')
    const tr = document.createElement('tr')
    tr.dataset.path = r.path

    tr.innerHTML = `
      <td title="${escapeHtml(r.filename)}" class="col-name-cell">${fileIcon(isDir)}<span class="filename-text">${escapeHtml(r.filename)}</span></td>
      <td title="${escapeHtml(r.path)}">${escapeHtml(r.path)}</td>
      <td>${isDir ? '--' : formatSize(r.size)}</td>
      <td>${r.dateModified}</td>
    `

    tr.addEventListener('dblclick', () => {
      window.api.openFile(r.path)
    })

    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      showContextMenu(e, r.path)
    })

    fragment.appendChild(tr)
  }
  resultsBody.appendChild(fragment)
}

function showContextMenu(e: MouseEvent, filePath: string): void {
  // Remove existing context menus
  document.querySelectorAll('.context-menu').forEach(el => el.remove())

  const menu = document.createElement('div')
  menu.className = 'context-menu'
  menu.style.left = `${e.clientX}px`
  menu.style.top = `${e.clientY}px`

  const items = [
    { label: '打开文件', action: () => window.api.openFile(filePath) },
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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

searchBtn.addEventListener('click', doSearch)
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch()
})

// Sort headers
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
  })
})

// Focus search input on load
searchInput.focus()
