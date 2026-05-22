import { openSettings } from './settings-panel'

const overlay = document.getElementById('onboarding-overlay')!
const btnDone = document.getElementById('btn-onboarding-done') as HTMLButtonElement
const btnSettings = document.getElementById('btn-onboarding-settings') as HTMLButtonElement
const esStatus = document.getElementById('onboarding-es')!
const aiStatus = document.getElementById('onboarding-ai')!

export async function initOnboarding(): Promise<void> {
  try {
    const diagnostics = await window.api.getDiagnostics()
    esStatus.textContent = diagnostics.info.esFound ? 'Everything 已就绪' : '未找到 Everything / es.exe'
    aiStatus.textContent = diagnostics.info.settings.aiProvider === 'ollama'
      ? `当前使用 ${diagnostics.info.settings.aiModel}，不可用时自动降级`
      : `${diagnostics.info.settings.aiProvider} / ${diagnostics.info.settings.hasApiKey ? '已配置 Key' : '未配置 Key'}`

    const settings = await window.api.getSettings()
    overlay.classList.toggle('hidden', settings.onboardingCompleted)
  } catch {
    overlay.classList.remove('hidden')
  }
}

btnDone.addEventListener('click', async () => {
  await window.api.markOnboardingCompleted()
  overlay.classList.add('hidden')
})

btnSettings.addEventListener('click', () => {
  overlay.classList.add('hidden')
  openSettings()
})
