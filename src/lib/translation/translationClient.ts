import type { TranslationCache } from '../../types/song'
import type { TranslationProvider } from './types'
import { getCached, setCached } from './translationCache'

export interface TranslateTextResult {
  translatedText: string
  cache: TranslationCache
}

/**
 * Looks up `text` in the cache first (an overridden entry is returned as-is,
 * since that IS the correct value — it must not be re-fetched). On a cache
 * miss, calls the provider, stores the result (with overridden: false), and
 * returns the translated text plus the updated cache.
 *
 * IMPORTANT: errors thrown by `provider.translate` are intentionally NOT
 * caught here — they propagate to the caller so UI code can show per-slide
 * error state instead of a silently-swallowed failure.
 */
export async function translateText(
  provider: TranslationProvider,
  cache: TranslationCache,
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateTextResult> {
  const cached = getCached(cache, sourceLang, targetLang, text)
  if (cached) {
    return { translatedText: cached.translatedText, cache }
  }

  const translatedText = await provider.translate(text, sourceLang, targetLang)

  const updatedCache = setCached(cache, {
    sourceText: text,
    sourceLang,
    targetLang,
    translatedText,
    fetchedAt: new Date().toISOString(),
    overridden: false,
  })

  return { translatedText, cache: updatedCache }
}
