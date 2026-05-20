import type { AIProviderConfig } from '../../shared/types'
import { OpenAIProvider } from './openai'
import { ClaudeProvider } from './claude'
import { OllamaProvider } from './ollama'

export interface AIProvider {
  translateToEverythingSyntax(naturalLanguageQuery: string): Promise<string>
}

export function createProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'claude':
      return new ClaudeProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
  }
}
