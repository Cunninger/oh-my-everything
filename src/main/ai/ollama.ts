import type { AIProviderConfig } from '../../shared/types'
import type { AIProvider } from './provider'
import { SYSTEM_PROMPT } from '../system-prompt'

export class OllamaProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async translateToEverythingSyntax(query: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434'
    const url = `${baseUrl}/api/chat`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(url, {
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
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Ollama API 错误 (${response.status}): ${text}`)
    }

    const data = await response.json()
    const content = data.message?.content?.trim()
    if (!content) throw new Error('Ollama 返回空结果')

    return content
  }
}
