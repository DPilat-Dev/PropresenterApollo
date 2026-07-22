import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { server } from '../test/mocks/server'
import { MYMEMORY_ENDPOINT } from '../test/mocks/handlers'
import { useAppStore } from './store'

beforeEach(() => {
  useAppStore.setState({
    song: null,
    sourceLanguage: 'en',
    targetLanguage: null,
    cache: {},
    translationErrors: {},
    translatingSlideIds: [],
  })
})

describe('translationSlice via useAppStore', () => {
  it('translateSlide translates a slide using the mocked provider and clears in-flight/error state', async () => {
    useAppStore.getState().importLyrics('hello\nworld', 1)
    useAppStore.getState().setTargetLanguage('es')
    const slideId = useAppStore.getState().song!.slides[0].id

    await useAppStore.getState().translateSlide(slideId)

    const slide = useAppStore.getState().song!.slides.find((s) => s.id === slideId)!
    expect(slide.translationText).not.toBeNull()
    expect(slide.translationText!.plainText).toBe('[es] hello')
    expect(useAppStore.getState().translatingSlideIds).not.toContain(slideId)
    expect(useAppStore.getState().translationErrors[slideId]).toBeUndefined()
  })

  it('translateSlide sets a translationError and does not throw when the provider fails', async () => {
    server.use(
      http.get(MYMEMORY_ENDPOINT, () => new HttpResponse(null, { status: 500 })),
    )

    useAppStore.getState().importLyrics('hello\nworld', 1)
    useAppStore.getState().setTargetLanguage('es')
    const slideId = useAppStore.getState().song!.slides[0].id

    await expect(useAppStore.getState().translateSlide(slideId)).resolves.toBeUndefined()

    expect(useAppStore.getState().translationErrors[slideId]).toBeTruthy()
    expect(typeof useAppStore.getState().translationErrors[slideId]).toBe('string')
    const slide = useAppStore.getState().song!.slides.find((s) => s.id === slideId)!
    expect(slide.translationText).toBeNull()
    expect(useAppStore.getState().translatingSlideIds).not.toContain(slideId)
  })

  it('translateSlide does nothing when targetLanguage is null', async () => {
    useAppStore.getState().importLyrics('hello\nworld', 1)
    const slideId = useAppStore.getState().song!.slides[0].id

    await expect(useAppStore.getState().translateSlide(slideId)).resolves.toBeUndefined()

    const slide = useAppStore.getState().song!.slides.find((s) => s.id === slideId)!
    expect(slide.translationText).toBeNull()
    expect(useAppStore.getState().translatingSlideIds).toHaveLength(0)
  })

  it('translateSlide translates a multi-line slide line by line', async () => {
    useAppStore.getState().importLyrics('hello\nworld', 2)
    useAppStore.getState().setTargetLanguage('es')
    const slideId = useAppStore.getState().song!.slides[0].id

    await useAppStore.getState().translateSlide(slideId)

    const slide = useAppStore.getState().song!.slides.find((s) => s.id === slideId)!
    expect(slide.translationText!.plainText).toBe('[es] hello\n[es] world')
  })

  it('rebuildTranslationsFromCache restores translations after a re-split without any API calls', async () => {
    useAppStore.getState().importLyrics('hello\nworld', 1)
    useAppStore.getState().setTargetLanguage('es')
    await useAppStore.getState().translateAllSlides()

    // Any network call from here on is a failure: the per-line cache must cover
    // the re-split entirely.
    server.use(
      http.get(MYMEMORY_ENDPOINT, () => {
        throw new Error('rebuildTranslationsFromCache must not hit the API')
      }),
    )

    useAppStore.getState().importLyrics('hello\nworld', 2)
    expect(useAppStore.getState().song!.slides).toHaveLength(1)

    useAppStore.getState().rebuildTranslationsFromCache()

    const slide = useAppStore.getState().song!.slides[0]
    expect(slide.translationText!.plainText).toBe('[es] hello\n[es] world')
  })

  it('persists the cache and target language on the song, so a reload can re-split without re-translating', async () => {
    useAppStore.getState().importLyrics('hello\nworld', 1)
    useAppStore.getState().setTargetLanguage('es')
    await useAppStore.getState().translateAllSlides()

    // What the autosave would have written to IndexedDB.
    const saved = structuredClone(useAppStore.getState().song!)
    expect(saved.targetLanguage).toBe('es')
    expect(Object.keys(saved.translationCache).length).toBeGreaterThan(0)

    // A reload: fresh in-memory state, then the song is loaded back.
    useAppStore.setState({ song: null, targetLanguage: null, cache: {} })
    server.use(
      http.get(MYMEMORY_ENDPOINT, () => {
        throw new Error('a reloaded song must not re-translate')
      }),
    )
    useAppStore.getState().setSong(saved)
    expect(useAppStore.getState().targetLanguage).toBe('es')

    useAppStore.getState().importLyrics('hello\nworld', 2)
    useAppStore.getState().rebuildTranslationsFromCache()

    expect(useAppStore.getState().song!.slides[0].translationText!.plainText).toBe('[es] hello\n[es] world')
  })

  it('recovers a cache from the slides of a song saved before the cache was persisted', () => {
    useAppStore.getState().importLyrics('hello\nworld', 2)
    useAppStore.getState().setTargetLanguage('es')
    const slideId = useAppStore.getState().song!.slides[0].id
    useAppStore.getState().updateSlideText(slideId, 'translation', '[es] hello\n[es] world')

    // An older record: translations on the slides, but no saved cache.
    const legacy = { ...structuredClone(useAppStore.getState().song!), translationCache: {} }
    useAppStore.setState({ song: null, targetLanguage: null, cache: {} })
    useAppStore.getState().setSong(legacy)

    useAppStore.getState().importLyrics('hello\nworld', 1)
    useAppStore.getState().rebuildTranslationsFromCache()

    const slides = useAppStore.getState().song!.slides
    expect(slides.map((s) => s.translationText!.plainText)).toEqual(['[es] hello', '[es] world'])
  })

  it('setTranslationOverride survives a subsequent translateAllSlides bulk re-translate', async () => {
    useAppStore.getState().importLyrics('hello\nworld', 1)
    useAppStore.getState().setTargetLanguage('es')
    const [overriddenSlideId, normalSlideId] = useAppStore.getState().song!.slides.map((s) => s.id)

    useAppStore.getState().setTranslationOverride(overriddenSlideId, 'my manual text')

    const overriddenSlide = useAppStore.getState().song!.slides.find((s) => s.id === overriddenSlideId)!
    expect(overriddenSlide.translationText!.plainText).toBe('my manual text')

    await useAppStore.getState().translateAllSlides()

    const finalState = useAppStore.getState().song!
    const overriddenAfter = finalState.slides.find((s) => s.id === overriddenSlideId)!
    const normalAfter = finalState.slides.find((s) => s.id === normalSlideId)!

    expect(overriddenAfter.translationText!.plainText).toBe('my manual text')
    expect(normalAfter.translationText!.plainText).toBe('[es] world')
  })
})
