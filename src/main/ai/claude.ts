import type { AIProviderConfig } from '../../shared/types'
import type { AIProvider } from './provider'
import { SYSTEM_PROMPT } from '../system-prompt'
import { AppNetworkError, fetchWithTimeout, normalizeProviderError } from '../services/net'

export class ClaudeProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async translateToEverythingSyntax(query: string): Promise<string> {
    try {
      return await this.translate(query)
    } catch (err) {
      throw normalizeProviderError('Claude', err)
    }
  }

  private async translate(query: string): Promise<string> {
    const baseUrl = (this.config.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '')
    const url = `${baseUrl}/v1/messages`

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: query },
        ],
      }),
    }, 25000)

    if (!response.ok) {
      const text = await response.text()
      throw new AppNetworkError(`API 错误 (${response.status}): ${text.slice(0, 300)}`, 'http', response.status)
    }

    const data = await response.json() as any
    const content = data.content?.[0]?.text?.trim()
    if (!content) throw new AppNetworkError('返回空结果', 'empty')

    return content
  }
}
