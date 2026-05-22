export class AppNetworkError extends Error {
  readonly code: 'timeout' | 'network' | 'http' | 'parse' | 'empty'
  readonly status?: number

  constructor(
    message: string,
    code: 'timeout' | 'network' | 'http' | 'parse' | 'empty',
    status?: number
  ) {
    super(message)
    this.name = 'AppNetworkError'
    this.code = code
    this.status = status
  }
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: init.signal || controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AppNetworkError(`请求超时 (${Math.round(timeoutMs / 1000)}s)`, 'timeout')
    }
    throw new AppNetworkError(`网络请求失败: ${err instanceof Error ? err.message : String(err)}`, 'network')
  } finally {
    clearTimeout(timeout)
  }
}

export function normalizeProviderError(provider: string, err: unknown): Error {
  if (err instanceof AppNetworkError) {
    return new Error(`${provider} ${err.message}`)
  }
  if (err instanceof Error) return err
  return new Error(`${provider} 请求失败: ${String(err)}`)
}
