import { describe, it, expect, vi } from 'vitest'
import type { TranslationCache } from '../../types/song'
import type { TranslationProvider } from './types'
import { setCached, markOverridden } from './translationCache'
import { translateText } from './translationClient'

function makeFakeProvider(translateImpl: (text: string, sourceLang: string, targetLang: string) => Promise<string>) {
  return {
    translate: vi.fn(translateImpl),
  } satisfies TranslationProvider
}

describe('translateText', () => {
  it('calls the provider and populates the cache on a cache miss', async () => {
    const provider = makeFakeProvider(async (text) => `translated:${text}`)
    const cache: TranslationCache = {}

    const result = await translateText(provider, cache, 'Hello', 'en', 'es')

    expect(result.translatedText).toBe('translated:Hello')
    expect(provider.translate).toHaveBeenCalledTimes(1)
    expect(provider.translate).toHaveBeenCalledWith('Hello', 'en', 'es')

    const entry = result.cache['en|es|Hello']
    expect(entry).toBeDefined()
    expect(entry.translatedText).toBe('translated:Hello')
    expect(entry.overridden).toBe(false)
  })

  it('does not call the provider again on a cache hit', async () => {
    const provider = makeFakeProvider(async (text) => `translated:${text}`)
    let cache: TranslationCache = {}

    const first = await translateText(provider, cache, 'Hello', 'en', 'es')
    cache = first.cache

    const second = await translateText(provider, cache, 'Hello', 'en', 'es')

    expect(second.translatedText).toBe('translated:Hello')
    expect(provider.translate).toHaveBeenCalledTimes(1)
  })

  it('returns an overridden cache entry as-is without calling the provider', async () => {
    const provider = makeFakeProvider(async () => {
      throw new Error('should not be called')
    })
    let cache: TranslationCache = setCached(
      {},
      {
        sourceText: 'Hello',
        sourceLang: 'en',
        targetLang: 'es',
        translatedText: 'Hola',
        fetchedAt: new Date().toISOString(),
        overridden: false,
      },
    )
    cache = markOverridden(cache, 'en', 'es', 'Hello', 'Hola (manual)')

    const result = await translateText(provider, cache, 'Hello', 'en', 'es')

    expect(result.translatedText).toBe('Hola (manual)')
    expect(provider.translate).not.toHaveBeenCalled()
    expect(result.cache).toBe(cache)
  })

  it('propagates a provider rejection instead of swallowing it', async () => {
    const provider = makeFakeProvider(async () => {
      throw new Error('network down')
    })
    const cache: TranslationCache = {}

    await expect(translateText(provider, cache, 'Hello', 'en', 'es')).rejects.toThrow('network down')
  })
})
