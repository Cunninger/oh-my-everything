import type { SearchResult } from '../../shared/types'
import { showErrorDialog } from './dialog'

const syntaxInput = document.getElementById('syntax-input') as HTMLInputElement
const rerunBtn = document.getElementById('btn-rerun') as HTMLButtonElement

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function renderResults(results: SearchResult[]): void {
  const resultsBody = document.getElementById('results-body')!
  const fragment = document.createDocumentFragment()
  for (const r of results) {
    const tr = document.createElement('tr')
    tr.dataset.path = r.path
    tr.innerHTML = `
      <td title="${escapeHtml(r.filename)}">${escapeHtml(r.filename)}</td>
      <td title="${escapeHtml(r.path)}">${escapeHtml(r.path)}</td>
      <td>${formatSize(r.size)}</td>
      <td>${r.dateModified}</td>
    `
    tr.addEventListener('dblclick', () => window.api.openFile(r.path))
    tr.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      showContextMenu(e, r.path)
    })
    fragment.appendChild(tr)
  }
  resultsBody.appendChild(fragment)
}

function showContextMenu(e: MouseEvent, filePath: string): void {
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
    div.addEventListener('click', () => { item.action(); menu.remove() })
    menu.appendChild(div)
  }
  document.body.appendChild(menu)
  const close = (e: MouseEvent): void => {
    if (!(e.target as HTMLElement).closest('.context-menu')) { menu.remove(); document.removeEventListener('click', close) }
  }
  setTimeout(() => document.addEventListener('click', close), 0)
}

async function rerunWithSyntax(): Promise<void> {
  const syntax = syntaxInput.value.trim()
  if (!syntax) return

  const resultsBody = document.getElementById('results-body')!
  const resultsEmpty = document.getElementById('results-empty')!
  const statusResults = document.getElementById('status-results')!

  resultsBody.innerHTML = ''
  resultsEmpty.classList.add('hidden')
  rerunBtn.disabled = true

  try {
    const results: SearchResult[] = await window.api.searchRaw(syntax)
    if (results.length === 0) {
      resultsEmpty.classList.remove('hidden')
    } else {
      renderResults(results)
    }
    statusResults.textContent = `${results.length} 条结果`
  } catch (err: unknown) {
    statusResults.textContent = `搜索失败: ${err instanceof Error ? err.message : String(err)}`
    showErrorDialog('搜索失败', err)
  } finally {
    rerunBtn.disabled = false
  }
}

rerunBtn.addEventListener('click', rerunWithSyntax)
syntaxInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') rerunWithSyntax()
})
