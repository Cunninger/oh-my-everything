import type { AIProviderConfig } from '../../shared/types'
import type { AIProvider } from './provider'
import { SYSTEM_PROMPT } from '../system-prompt'

export class ClaudeProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async translateToEverythingSyntax(query: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com'
    const url = `${baseUrl}/v1/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: query },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Claude API 错误 (${response.status}): ${text}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text?.trim()
    if (!content) throw new Error('Claude 返回空结果')

    return content
  }
}
