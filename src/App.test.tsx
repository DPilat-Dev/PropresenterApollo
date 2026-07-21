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
  it('shows the home/landing view (not the editor shell) when there is no active song', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    expect(screen.getByRole('heading', { name: /worship slides/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /your songs/i })).toBeInTheDocument()

    // The editor-only panels must not be present yet.
    expect(screen.queryByLabelText('Paste lyrics')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /export to propresenter/i })).not.toBeInTheDocument()

    // Let the async listSongs() effect in SongManager settle before asserting no errors logged.
    await screen.findByText(/no saved songs yet|failed to list songs/i)

    expect(consoleError).not.toHaveBeenCalled()
  })

  it('shows the full editor shell once a song exists in the store', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    useAppStore.getState().newSong('My Song')
    render(<App />)

    expect(screen.getByLabelText('Paste lyrics')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate slides/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export to propresenter/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to songs/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My Song' })).toBeInTheDocument()
    // A brand-new song has no slides yet, so Quick Edit (which needs at least
    // one slide) is not shown - see the slide-generation test below for that.
    expect(screen.queryByRole('region', { name: /quick edit/i })).not.toBeInTheDocument()
    // The home/song-list-only content must be gone.
    expect(screen.queryByRole('heading', { name: /your songs/i })).not.toBeInTheDocument()

    expect(consoleError).not.toHaveBeenCalled()
  })

  it('pasting lyrics and generating slides makes them appear in the slide list and preview', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    useAppStore.getState().newSong('My Song')
    render(<App />)

    await user.type(screen.getByLabelText('Paste lyrics'), 'line one{Enter}line two')
    await user.click(screen.getByRole('button', { name: /generate slides/i }))

    expect(useAppStore.getState().song?.slides.length).toBeGreaterThan(0)
    expect(screen.getByTestId('slide-preview-canvas')).toBeInTheDocument()
    // Once slides exist, the bulk Quick Edit section (inside the STYLE
    // panel's Layout tab) mounts - it doesn't require a slide to be selected.
    expect(screen.getByRole('region', { name: /quick edit/i })).toBeInTheDocument()
  })

  it('creating a new song from the home view transitions straight into the editor', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('new-song-button'))
    await user.type(screen.getByTestId('new-song-title-input'), 'Home Flow Song')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(useAppStore.getState().song?.title).toBe('Home Flow Song')
    expect(screen.getByLabelText('Paste lyrics')).toBeInTheDocument()
  })

  it('the header "+ New Song" button creates a song immediately and transitions into the editor', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('header-new-song-button'))

    expect(useAppStore.getState().song?.title).toBe('Untitled Song')
    expect(screen.getByLabelText('Paste lyrics')).toBeInTheDocument()
  })

  it('the back button in the editor returns to the home/song-list view', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    useAppStore.getState().newSong('My Song')
    render(<App />)

    await user.click(screen.getByRole('button', { name: /back to songs/i }))

    expect(useAppStore.getState().song).toBeNull()
    expect(screen.getByRole('heading', { name: /your songs/i })).toBeInTheDocument()
  })
})
