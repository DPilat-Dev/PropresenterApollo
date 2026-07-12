import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../state/store'
import { TranslationPanel } from './TranslationPanel'

beforeEach(() => {
  useAppStore.setState({
    song: null,
    selectedSlideId: null,
    sourceLanguage: 'en',
    targetLanguage: null,
    cache: {},
    translationErrors: {},
    translatingSlideIds: [],
  })
})

describe('TranslationPanel', () => {
  it('disables "Translate all slides" when no target language is selected', () => {
    render(<TranslationPanel />)
    expect(screen.getByRole('button', { name: /translate all slides/i })).toBeDisabled()
  })

  it('enables "Translate all slides" once a target language is chosen', async () => {
    const user = userEvent.setup()
    render(<TranslationPanel />)

    await user.selectOptions(screen.getByLabelText(/target language/i), 'es')

    expect(useAppStore.getState().targetLanguage).toBe('es')
    expect(screen.getByRole('button', { name: /translate all slides/i })).toBeEnabled()
  })

  it('disables both translate buttons while a translation is in flight', () => {
    useAppStore.setState({ targetLanguage: 'es', translatingSlideIds: ['slide-1'] })
    render(<TranslationPanel />)

    expect(screen.getByRole('button', { name: /translating/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /translate this slide/i })).toBeDisabled()
  })

  it('disables "Translate this slide" when no slide is selected', () => {
    useAppStore.setState({ targetLanguage: 'es', selectedSlideId: null })
    render(<TranslationPanel />)
    expect(screen.getByRole('button', { name: /translate this slide/i })).toBeDisabled()
  })

  it('setting target language to "None" calls setTargetLanguage(null)', async () => {
    useAppStore.setState({ targetLanguage: 'es' })
    const user = userEvent.setup()
    render(<TranslationPanel />)

    await user.selectOptions(screen.getByLabelText(/target language/i), '')

    expect(useAppStore.getState().targetLanguage).toBeNull()
  })
})

describe('TranslationStatusBadge (via TranslationPanel)', () => {
  it('shows nothing when idle', () => {
    useAppStore.getState().importLyrics('hello', 1)
    const slideId = useAppStore.getState().song!.slides[0].id
    useAppStore.getState().selectSlide(slideId)
    render(<TranslationPanel />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a translating indicator for the selected slide', () => {
    useAppStore.getState().importLyrics('hello', 1)
    const slideId = useAppStore.getState().song!.slides[0].id
    useAppStore.setState({ selectedSlideId: slideId, translatingSlideIds: [slideId] })
    render(<TranslationPanel />)

    expect(screen.getByRole('status')).toHaveTextContent(/translating/i)
  })

  it('shows the error message for the selected slide, styled as an error', () => {
    useAppStore.getState().importLyrics('hello', 1)
    const slideId = useAppStore.getState().song!.slides[0].id
    useAppStore.setState({ selectedSlideId: slideId, translationErrors: { [slideId]: 'Network error' } })
    render(<TranslationPanel />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/network error/i)
    expect(alert.style.color).toBe('red')
  })
})
