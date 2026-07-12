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

    const sourceText = slide.mainText.plainText

    set((state) => {
      const { [slideId]: _removed, ...remainingErrors } = state.translationErrors
      return {
        translatingSlideIds: [...state.translatingSlideIds, slideId],
        translationErrors: remainingErrors,
      }
    })

    try {
      const result = await translateText(
        get().provider,
        get().cache,
        sourceText,
        get().sourceLanguage,
        targetLanguage,
      )
      set({ cache: result.cache })
      get().updateSlideText(slideId, 'translation', result.translatedText)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set((state) => ({ translationErrors: { ...state.translationErrors, [slideId]: message } }))
    } finally {
      set((state) => ({
        translatingSlideIds: state.translatingSlideIds.filter((id) => id !== slideId),
      }))
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
