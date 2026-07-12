import type { TranslationCache, TranslationCacheEntry } from '../../types/song'
import { translationCacheKey } from '../../types/song'

/**
 * Looks up a cached translation entry. Returns the entry regardless of its
 * `overridden` status — an overridden entry's `translatedText` is the correct,
 * user-authored value and should be treated the same as a fetched one for
 * lookup purposes.
 */
export function getCached(
  cache: TranslationCache,
  sourceLang: string,
  targetLang: string,
  sourceText: string,
): TranslationCacheEntry | undefined {
  return cache[translationCacheKey(sourceLang, targetLang, sourceText)]
}

/**
 * Returns a new cache object with `entry` stored under its derived key.
 * Does not mutate the passed-in cache.
 */
export function setCached(cache: TranslationCache, entry: TranslationCacheEntry): TranslationCache {
  const key = translationCacheKey(entry.sourceLang, entry.targetLang, entry.sourceText)
  return {
    ...cache,
    [key]: entry,
  }
}

/**
 * Marks a cache entry as manually overridden by the user, updating its
 * translatedText. A subsequent bulk re-translate must check `overridden` and
 * skip entries where it's true, so the user's edit isn't clobbered.
 *
 * If no entry exists yet for this key, a new one is created (fetchedAt is
 * stamped with the current time).
 */
export function markOverridden(
  cache: TranslationCache,
  sourceLang: string,
  targetLang: string,
  sourceText: string,
  newText: string,
): TranslationCache {
  const key = translationCacheKey(sourceLang, targetLang, sourceText)
  const existing = cache[key]

  const entry: TranslationCacheEntry = existing
    ? { ...existing, translatedText: newText, overridden: true }
    : {
        sourceText,
        sourceLang,
        targetLang,
        translatedText: newText,
        fetchedAt: new Date().toISOString(),
        overridden: true,
      }

  return {
    ...cache,
    [key]: entry,
  }
}
