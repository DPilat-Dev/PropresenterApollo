import type { TranslationProvider } from '../types'
import { TranslationError } from '../types'

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get'
const DEFAULT_TIMEOUT_MS = 10_000

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string
  }
  responseStatus?: number
}

/**
 * MyMemory has a quirk where quota-exceeded / rate-limited errors are returned
 * with HTTP 200 and an error payload rather than a real HTTP error status. We
 * detect that here so callers never mistake a warning string for a real
 * translation.
 */
function isWarningPayload(body: MyMemoryResponse): boolean {
  if (body.responseStatus !== undefined && body.responseStatus !== 200) {
    return true
  }
  const translatedText = body.responseData?.translatedText
  if (typeof translatedText === 'string' && translatedText.toUpperCase().includes('MYMEMORY WARNING')) {
    return true
  }
  return false
}

export class MyMemoryProvider implements TranslationProvider {
  private readonly timeoutMs: number

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await fetch(url, { signal: controller.signal })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TranslationError(`Translation request timed out after ${this.timeoutMs}ms`, { cause: error })
      }
      throw new TranslationError(
        `Translation request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw new TranslationError(`Translation request failed with HTTP status ${response.status}`)
    }

    let body: MyMemoryResponse
    try {
      body = (await response.json()) as MyMemoryResponse
    } catch (error) {
      throw new TranslationError('Translation response was not valid JSON', { cause: error })
    }

    if (isWarningPayload(body)) {
      throw new TranslationError(
        `MyMemory translation failed: ${body.responseData?.translatedText ?? `responseStatus ${body.responseStatus}`}`,
      )
    }

    const translatedText = body.responseData?.translatedText
    if (typeof translatedText !== 'string' || translatedText.length === 0) {
      throw new TranslationError('Translation response did not contain translatedText')
    }

    return translatedText
  }
}
