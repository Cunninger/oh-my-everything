import type { AIProviderConfig } from '../../shared/types'
import type { AIProvider } from './provider'
import { SYSTEM_PROMPT } from '../system-prompt'
import { AppNetworkError, fetchWithTimeout, normalizeProviderError } from '../services/net'
import { parseOpenAIResponse } from './openai-response'

export class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async translateToEverythingSyntax(query: string): Promise<string> {
    try {
      return await this.translate(query)
    } catch (err) {
      throw normalizeProviderError('OpenAI', err)
    }
  }

  private async translate(query: string): Promise<string> {
    const baseUrl = (this.config.baseUrl || 'https://api.openai.com').replace(/\/+$/, '')
    const url = `${baseUrl}/v1/chat/completions`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const body = JSON.stringify({
      model: this.config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0,
      max_tokens: 8192,
    })

    const response = await fetchWithTimeout(url, { method: 'POST', headers, body }, 25000)

    const rawText = await response.text()

    if (!response.ok) {
      throw new AppNetworkError(`API 错误 (${response.status}): ${rawText.slice(0, 300)}`, 'http', response.status)
    }

    return parseOpenAIResponse(rawText)
  }
}
