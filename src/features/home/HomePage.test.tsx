import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../state/store'
import { StorageError } from '../../storage/songRepository'
import type { Song } from '../../types/song'
import { HomePage } from './HomePage'

const { listSongsMock, loadSongMock, deleteSongMock } = vi.hoisted(() => ({
  listSongsMock: vi.fn(),
  loadSongMock: vi.fn(),
  deleteSongMock: vi.fn(),
}))

vi.mock('../../storage/songRepository', async () => {
  const actual = await vi.importActual<typeof import('../../storage/songRepository')>('../../storage/songRepository')
  return {
    ...actual,
    listSongs: listSongsMock,
    loadSong: loadSongMock,
    deleteSong: deleteSongMock,
  }
})

function makeFixtureSong(overrides?: Partial<Song>): Song {
  const now = new Date().toISOString()
  return {
    id: 'song-1',
    title: 'Amazing Grace',
    rawLyrics: 'Amazing grace',
    splitSettings: { linesPerSlide: 2, skipBlankLines: true },
    slides: [],
    groups: [],
    targetLanguage: null,
    artist: '',
    sourceLanguage: 'en',
    translationCache: {},
    layout: 'original-translation',
    thirdLanguageColor: { r: 0.556863, g: 0.803922, b: 0.901961, a: 1 },
    published: false,
    autoFitBox: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  useAppStore.setState({ song: null, selectedSlideId: null })
  listSongsMock.mockReset()
  loadSongMock.mockReset()
  deleteSongMock.mockReset()
  listSongsMock.mockResolvedValue([])
  loadSongMock.mockResolvedValue(undefined)
  deleteSongMock.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('HomePage', () => {
  it('renders the landing content describing the tool when no song is loaded', async () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { name: /worship slides/i })).toBeInTheDocument()
    expect(screen.getByText(/paste lyrics/i)).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument()

    // Song list panel is reused as-is.
    expect(await screen.findByRole('heading', { name: /your songs/i })).toBeInTheDocument()
  })

  it('creating a new song from the inline form puts a song in the store', async () => {
    const user = userEvent.setup()
    render(<HomePage />)
    await waitFor(() => expect(listSongsMock).toHaveBeenCalledTimes(1))

    expect(useAppStore.getState().song).toBeNull()

    await user.click(screen.getByTestId('new-song-button'))
    await user.type(screen.getByTestId('new-song-title-input'), 'Brand New Song')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(useAppStore.getState().song).not.toBeNull()
    expect(useAppStore.getState().song!.title).toBe('Brand New Song')
  })

  it('the hero "New Song" button creates a song immediately (no title prompt)', async () => {
    const user = userEvent.setup()
    render(<HomePage />)

    await user.click(screen.getByTestId('hero-new-song-button'))

    expect(useAppStore.getState().song).not.toBeNull()
    expect(useAppStore.getState().song!.title).toBe('Untitled Song')
  })

  it('loading a saved song from the home view puts that song in the store', async () => {
    const fixture = makeFixtureSong({ id: 'song-xyz', title: 'Load Me' })
    listSongsMock.mockResolvedValue([fixture])
    loadSongMock.mockResolvedValue(fixture)

    const user = userEvent.setup()
    render(<HomePage />)

    expect(useAppStore.getState().song).toBeNull()

    const loadButton = await screen.findByTestId('load-song-song-xyz')
    await user.click(loadButton)

    await waitFor(() => expect(loadSongMock).toHaveBeenCalledWith('song-xyz'))
    await waitFor(() => expect(useAppStore.getState().song?.id).toBe('song-xyz'))
  })

  it('surfaces a StorageError from the reused song list instead of crashing', async () => {
    listSongsMock.mockRejectedValue(new StorageError('boom'))

    render(<HomePage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/boom/i)
  })
})
