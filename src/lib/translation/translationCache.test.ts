import { describe, it, expect } from 'vitest'
import type { TranslationCache, TranslationCacheEntry } from '../../types/song'
import { getCached, setCached, markOverridden } from './translationCache'

function makeEntry(overrides: Partial<TranslationCacheEntry> = {}): TranslationCacheEntry {
  return {
    sourceText: 'Hello',
    sourceLang: 'en',
    targetLang: 'es',
    translatedText: 'Hola',
    fetchedAt: '2026-01-01T00:00:00.000Z',
    overridden: false,
    ...overrides,
  }
}

describe('translationCache', () => {
  it('getCached returns undefined for a cache miss', () => {
    const cache: TranslationCache = {}

    expect(getCached(cache, 'en', 'es', 'Hello')).toBeUndefined()
  })

  it('setCached stores an entry retrievable via getCached (round-trip)', () => {
    const cache: TranslationCache = {}
    const entry = makeEntry()

    const updated = setCached(cache, entry)

    expect(getCached(updated, 'en', 'es', 'Hello')).toEqual(entry)
  })

  it('setCached does not mutate the original cache object', () => {
    const cache: TranslationCache = {}
    const entry = makeEntry()

    const updated = setCached(cache, entry)

    expect(cache).toEqual({})
    expect(updated).not.toBe(cache)
  })

  it('markOverridden updates translatedText and sets overridden: true', () => {
    const cache: TranslationCache = {}
    const withEntry = setCached(cache, makeEntry())

    const updated = markOverridden(withEntry, 'en', 'es', 'Hello', 'Hola (edited)')

    const result = getCached(updated, 'en', 'es', 'Hello')
    expect(result?.translatedText).toBe('Hola (edited)')
    expect(result?.overridden).toBe(true)
  })

  it('markOverridden does not mutate the original cache object', () => {
    const cache: TranslationCache = {}
    const withEntry = setCached(cache, makeEntry())
    const snapshot = { ...withEntry }

    const updated = markOverridden(withEntry, 'en', 'es', 'Hello', 'Hola (edited)')

    expect(withEntry).toEqual(snapshot)
    expect(updated).not.toBe(withEntry)
  })

  it('markOverridden creates a new entry when none exists yet', () => {
    const cache: TranslationCache = {}

    const updated = markOverridden(cache, 'en', 'fr', 'Goodbye', 'Au revoir')

    const result = getCached(updated, 'en', 'fr', 'Goodbye')
    expect(result?.translatedText).toBe('Au revoir')
    expect(result?.overridden).toBe(true)
    expect(result?.sourceLang).toBe('en')
    expect(result?.targetLang).toBe('fr')
    expect(result?.sourceText).toBe('Goodbye')
  })

  it('keeps distinct entries for different language pairs of the same source text', () => {
    let cache: TranslationCache = {}
    cache = setCached(cache, makeEntry({ targetLang: 'es', translatedText: 'Hola' }))
    cache = setCached(cache, makeEntry({ targetLang: 'fr', translatedText: 'Bonjour' }))

    expect(getCached(cache, 'en', 'es', 'Hello')?.translatedText).toBe('Hola')
    expect(getCached(cache, 'en', 'fr', 'Hello')?.translatedText).toBe('Bonjour')
  })
})
