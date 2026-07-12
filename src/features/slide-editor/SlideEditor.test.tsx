import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../state/store'
import { SlideEditor } from './SlideEditor'

beforeEach(() => {
  useAppStore.setState({
    song: null,
    selectedSlideId: null,
    targetLanguage: null,
    translatingSlideIds: [],
    translationErrors: {},
    cache: {},
  })
})

function selectFirstSlide() {
  useAppStore.getState().importLyrics('hello\nworld', 2)
  const song = useAppStore.getState().song!
  const slideId = song.slides[0].id
  useAppStore.getState().selectSlide(slideId)
  return slideId
}

describe('SlideEditor', () => {
  it('shows a placeholder when no slide is selected', () => {
    render(<SlideEditor />)
    expect(screen.getByText(/select a slide to edit it/i)).toBeInTheDocument()
  })

  it('shows a placeholder when there is no song', () => {
    useAppStore.getState().selectSlide('nonexistent')
    render(<SlideEditor />)
    expect(screen.getByText(/select a slide to edit it/i)).toBeInTheDocument()
  })

  it('renders the selected slide main text in a textarea', () => {
    selectFirstSlide()
    render(<SlideEditor />)
    const textarea = screen.getByLabelText(/^main text$/i) as HTMLTextAreaElement
    expect(textarea.value).toBe('hello\nworld')
  })

  it('editing the main text textarea updates the store via updateSlideText', async () => {
    const slideId = selectFirstSlide()
    const user = userEvent.setup()
    render(<SlideEditor />)

    const textarea = screen.getByLabelText(/^main text$/i)
    await user.clear(textarea)
    await user.type(textarea, 'new lyrics')

    const slide = useAppStore.getState().song!.slides.find((s) => s.id === slideId)!
    expect(slide.mainText.plainText).toBe('new lyrics')
  })

  it('shows a note instead of a translation textarea when translationText is null', () => {
    selectFirstSlide()
    render(<SlideEditor />)
    expect(screen.getByText(/no translation yet/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^translation text$/i)).not.toBeInTheDocument()
  })

  it('editing the translation textarea calls setTranslationOverride (not a raw updateSlideText)', async () => {
    const slideId = selectFirstSlide()
    useAppStore.getState().updateSlideText(slideId, 'translation', 'existing translation')
    const user = userEvent.setup()
    render(<SlideEditor />)

    const textarea = screen.getByLabelText(/^translation text$/i)
    await user.clear(textarea)
    await user.type(textarea, 'hola mundo')

    const slide = useAppStore.getState().song!.slides.find((s) => s.id === slideId)!
    expect(slide.translationText!.plainText).toBe('hola mundo')
  })

  it('marks the translation cache entry as overridden after a manual edit, protecting it from bulk re-translate', async () => {
    const slideId = selectFirstSlide()
    useAppStore.getState().setTargetLanguage('es')
    useAppStore.getState().updateSlideText(slideId, 'translation', 'existing translation')
    const user = userEvent.setup()
    render(<SlideEditor />)

    const textarea = screen.getByLabelText(/^translation text$/i)
    await user.clear(textarea)
    await user.type(textarea, 'manual override')

    const cacheKey = Object.keys(useAppStore.getState().cache).find((key) => key.includes('hello\nworld'))
    expect(cacheKey).toBeDefined()
    expect(useAppStore.getState().cache[cacheKey!].overridden).toBe(true)
    expect(useAppStore.getState().cache[cacheKey!].translatedText).toBe('manual override')
  })

  it('changing the main font size calls updateSlideStyle with the new fontSizePt', () => {
    const slideId = selectFirstSlide()
    render(<SlideEditor />)

    const fontSizeInput = screen.getByLabelText(/main text font size/i)
    fireEvent.change(fontSizeInput, { target: { value: '80' } })

    const slide = useAppStore.getState().song!.slides.find((s) => s.id === slideId)!
    expect(slide.mainText.style.fontSizePt).toBe(80)
  })
})
