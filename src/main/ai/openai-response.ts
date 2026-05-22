export class OpenAIResponseError extends Error {
  readonly code: 'http' | 'parse' | 'empty'

  constructor(message: string, code: 'http' | 'parse' | 'empty') {
    super(message)
    this.name = 'OpenAIResponseError'
    this.code = code
  }
}

export function parseOpenAIResponse(rawText: string): string {
  let data: any
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new OpenAIResponseError(`API 返回非 JSON: ${rawText.slice(0, 300)}`, 'parse')
  }

  if (data.error) {
    throw new OpenAIResponseError(`API 错误: ${JSON.stringify(data.error)}`, 'http')
  }

  const msg = data.choices?.[0]?.message
  const content =
    msg?.content?.trim() ||
    msg?.reasoning_content?.trim() ||
    data.output?.trim() ||
    data.content?.trim() ||
    data.response?.trim()

  if (!content) {
    throw new OpenAIResponseError(`返回空结果，原始响应: ${rawText.slice(0, 500)}`, 'empty')
  }

  return content
}
