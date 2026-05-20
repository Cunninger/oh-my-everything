import type { AIProviderConfig } from '../../shared/types'
import type { AIProvider } from './provider'
import { SYSTEM_PROMPT } from '../system-prompt'

export class OpenAIProvider implements AIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async translateToEverythingSyntax(query: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com'
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

    console.log(`[AI] POST ${url}, model=${this.config.model}`)

    let response: Response
    try {
      response = await fetch(url, { method: 'POST', headers, body })
    } catch (err) {
      console.error('[AI] fetch failed:', err)
      throw new Error(`网络请求失败: ${err instanceof Error ? err.message : String(err)}`)
    }

    const rawText = await response.text()
    console.log(`[AI] status=${response.status}, body=${rawText.slice(0, 500)}`)

    if (!response.ok) {
      throw new Error(`API 错误 (${response.status}): ${rawText.slice(0, 300)}`)
    }

    let data: any
    try {
      data = JSON.parse(rawText)
    } catch {
      throw new Error(`API 返回非 JSON: ${rawText.slice(0, 300)}`)
    }

    // Check for API-level errors even with 200 status
    if (data.error) {
      throw new Error(`API 错误: ${JSON.stringify(data.error)}`)
    }

    const msg = data.choices?.[0]?.message
    const content =
      msg?.content?.trim() ||
      msg?.reasoning_content?.trim() ||
      data.output?.trim() ||
      data.content?.trim() ||
      data.response?.trim()

    if (!content) {
      throw new Error(`返回空结果，原始响应: ${rawText.slice(0, 500)}`)
    }

    return content
  }
}
