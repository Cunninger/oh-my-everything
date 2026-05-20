import { createProvider } from '../ai/provider'
import { getSettings } from './settings'

export async function translateQuery(query: string): Promise<string> {
  const settings = getSettings()
  const provider = createProvider(settings.ai)
  return provider.translateToEverythingSyntax(query)
}
