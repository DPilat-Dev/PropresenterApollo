import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './state/store'
import App from './App'

// Full-app smoke test: renders the real composed App (all feature panels +
// SongManager + autosave indicator) against a real fake-indexeddb backend,
// and asserts nothing throws / logs a console.error during mount - a stand-in
// for "load it in a browser and check devtools" in a headless CI context.
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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the full page composition without console errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    expect(screen.getByRole('heading', { name: /lyrics.*propresenter/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Paste lyrics')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate slides/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export to propresenter/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /saved songs/i })).toBeInTheDocument()

    // Let the async listSongs() effect in SongManager settle before asserting no errors logged.
    await screen.findByText(/no saved songs yet|failed to list songs/i)

    expect(consoleError).not.toHaveBeenCalled()
  })

  it('pasting lyrics and generating slides makes them appear in the slide list and preview', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Paste lyrics'), 'line one{Enter}line two')
    await user.click(screen.getByRole('button', { name: /generate slides/i }))

    expect(useAppStore.getState().song?.slides.length).toBeGreaterThan(0)
    expect(screen.getByTestId('slide-preview-canvas')).toBeInTheDocument()
  })
})
