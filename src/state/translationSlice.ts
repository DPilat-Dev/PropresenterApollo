import { getCached, markOverridden } from '../lib/translation/translationCache'
import { translateText } from '../lib/translation/translationClient'
import { MyMemoryProvider } from '../lib/translation/providers/myMemoryProvider'
import type { Slice, TranslationSlice } from './types'

export const createTranslationSlice: Slice<TranslationSlice> = (set, get) => ({
  sourceLanguage: 'en',
  targetLanguage: null,
  cache: {},
  provider: new MyMemoryProvider(),
  translationErrors: {},
  translatingSlideIds: [],

  setTargetLanguage: (lang) => set({ targetLanguage: lang }),

  translateSlide: async (slideId) => {
    const song = get().song
    if (!song) return
    const slide = song.slides.find((s) => s.id === slideId)
    if (!slide) return

    const targetLanguage = get().targetLanguage
    if (!targetLanguage) return

    set((state) => {
      const { [slideId]: _removed, ...remainingErrors } = state.translationErrors
      return {
        translatingSlideIds: [...state.translatingSlideIds, slideId],
        translationErrors: remainingErrors,
      }
    })

    try {
      // Translate line by line (blank lines pass through untouched). Each line
      // is cached by its own text, so the same line reused across a re-split -
      // or shared between slides - is only ever fetched once.
      const lines = slide.mainText.plainText.split('\n')
      let cache = get().cache
      const translated: string[] = []
      for (const line of lines) {
        if (line.trim() === '') {
          translated.push('')
          continue
        }
        const result = await translateText(get().provider, cache, line, get().sourceLanguage, targetLanguage)
        cache = result.cache
        translated.push(result.translatedText)
      }
      set({ cache })
      get().updateSlideText(slideId, 'translation', translated.join('\n'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set((state) => ({ translationErrors: { ...state.translationErrors, [slideId]: message } }))
    } finally {
      set((state) => ({
        translatingSlideIds: state.translatingSlideIds.filter((id) => id !== slideId),
      }))
    }
  },

  rebuildTranslationsFromCache: () => {
    const song = get().song
    const targetLanguage = get().targetLanguage
    if (!song || !targetLanguage) return
    const sourceLanguage = get().sourceLanguage
    const cache = get().cache

    for (const slide of song.slides) {
      const lines = slide.mainText.plainText.split('\n')
      const translated: string[] = []
      let complete = true
      let anyLine = false
      for (const line of lines) {
        if (line.trim() === '') {
          translated.push('')
          continue
        }
        anyLine = true
        const entry = getCached(cache, sourceLanguage, targetLanguage, line)
        if (!entry) {
          complete = false
          break
        }
        translated.push(entry.translatedText)
      }
      // Only fill a slide whose every line is already cached (leave the rest for
      // an explicit translate); never make a network call here.
      if (complete && anyLine) {
        get().updateSlideText(slide.id, 'translation', translated.join('\n'))
      }
    }
  },

  translateAllSlides: async () => {
    const song = get().song
    if (!song) return

    const targetLanguage = get().targetLanguage
    if (!targetLanguage) return

    for (const slide of song.slides) {
      const cached = getCached(get().cache, get().sourceLanguage, targetLanguage, slide.mainText.plainText)
      if (cached?.overridden) continue
      await get().translateSlide(slide.id)
    }
  },

  setTranslationOverride: (slideId, text) => {
    const song = get().song
    if (!song) return
    const slide = song.slides.find((s) => s.id === slideId)
    if (!slide) return

    get().updateSlideText(slideId, 'translation', text)

    const targetLanguage = get().targetLanguage
    if (!targetLanguage) return

    set({
      cache: markOverridden(get().cache, get().sourceLanguage, targetLanguage, slide.mainText.plainText, text),
    })
  },
})
