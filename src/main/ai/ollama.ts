import type { AIProviderConfig } from '../../shared/types'
import type { AIProvider } from './provider'
import { SYSTEM_PROMPT } from '../system-prompt'
import { AppNetworkError, fetchWithTimeout, normalizeProviderError } from '../services/net'

export class OllamaProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async translateToEverythingSyntax(query: string): Promise<string> {
    try {
      return await this.translate(query)
    } catch (err) {
      throw normalizeProviderError('Ollama', err)
    }
  }

  private async translate(query: string): Promise<string> {
    const baseUrl = (this.config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '')
    const url = `${baseUrl}/api/chat`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model || 'llama3',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        stream: false,
      }),
    }, 25000)

    if (!response.ok) {
      const text = await response.text()
      throw new AppNetworkError(`API 错误 (${response.status}): ${text.slice(0, 300)}`, 'http', response.status)
    }

    const data = await response.json() as any
    const content = data.message?.content?.trim()
    if (!content) throw new AppNetworkError('返回空结果', 'empty')

    return content
  }
}
