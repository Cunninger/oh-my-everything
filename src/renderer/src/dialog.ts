const dialogOverlay = document.getElementById('dialog-overlay')!
const dialogTitle = document.getElementById('dialog-title')!
const dialogMessage = document.getElementById('dialog-message')!
const dialogDetails = document.getElementById('dialog-details') as HTMLTextAreaElement
const btnCloseDialog = document.getElementById('btn-close-dialog')!
const btnCopyDialog = document.getElementById('btn-copy-dialog')!

export function showDialog(title: string, message: string, details?: string): void {
  dialogTitle.textContent = title
  dialogMessage.textContent = message
  dialogDetails.value = details || ''
  dialogDetails.classList.toggle('hidden', !details)
  btnCopyDialog.classList.toggle('hidden', !details)
  dialogOverlay.classList.remove('hidden')
}

export function showErrorDialog(message: string, error?: unknown): void {
  const details = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error || '')
  showDialog('错误', message, details)
}

btnCloseDialog.addEventListener('click', () => {
  dialogOverlay.classList.add('hidden')
})

btnCopyDialog.addEventListener('click', () => {
  navigator.clipboard.writeText(dialogDetails.value)
})

dialogOverlay.addEventListener('click', (e) => {
  if (e.target === dialogOverlay) dialogOverlay.classList.add('hidden')
})
