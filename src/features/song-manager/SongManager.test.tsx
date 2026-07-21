import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../state/store'
import { StorageError } from '../../storage/songRepository'
import type { Song } from '../../types/song'
import { SongManager } from './SongManager'

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
    layout: 'original-translation',
    thirdLanguageColor: { r: 0.556863, g: 0.803922, b: 0.901961, a: 1 },
    published: false,
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

describe('SongManager', () => {
  it('lists saved songs on mount', async () => {
    listSongsMock.mockResolvedValue([
      makeFixtureSong({ id: 'a', title: 'Song A' }),
      makeFixtureSong({ id: 'b', title: 'Song B' }),
    ])

    render(<SongManager />)

    expect(await screen.findByText('Song A')).toBeInTheDocument()
    expect(screen.getByText('Song B')).toBeInTheDocument()
    expect(listSongsMock).toHaveBeenCalledTimes(1)
  })

  it('shows a message when there are no saved songs', async () => {
    render(<SongManager />)
    expect(await screen.findByText(/no saved songs yet/i)).toBeInTheDocument()
  })

  it('creating a new song via the inline form calls newSong on the store', async () => {
    const user = userEvent.setup()
    render(<SongManager />)
    await waitFor(() => expect(listSongsMock).toHaveBeenCalledTimes(1))

    await user.click(screen.getByTestId('new-song-button'))
    await user.type(screen.getByTestId('new-song-title-input'), 'My New Song')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(useAppStore.getState().song).not.toBeNull()
    expect(useAppStore.getState().song!.title).toBe('My New Song')
    // Re-lists after creating.
    await waitFor(() => expect(listSongsMock).toHaveBeenCalledTimes(2))
  })

  it('clicking a saved song loads it and sets it as the current song', async () => {
    const fixture = makeFixtureSong({ id: 'song-xyz', title: 'Load Me' })
    listSongsMock.mockResolvedValue([fixture])
    loadSongMock.mockResolvedValue(fixture)

    const user = userEvent.setup()
    render(<SongManager />)

    const loadButton = await screen.findByTestId('load-song-song-xyz')
    await user.click(loadButton)

    await waitFor(() => expect(loadSongMock).toHaveBeenCalledWith('song-xyz'))
    await waitFor(() => expect(useAppStore.getState().song?.id).toBe('song-xyz'))
  })

  it('deletes a song after confirmation and refreshes the list', async () => {
    const fixture = makeFixtureSong({ id: 'song-del', title: 'Delete Me' })
    listSongsMock.mockResolvedValueOnce([fixture]).mockResolvedValueOnce([])
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const user = userEvent.setup()
    render(<SongManager />)

    await screen.findByText('Delete Me')
    await user.click(screen.getByRole('button', { name: /delete delete me/i }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(deleteSongMock).toHaveBeenCalledWith('song-del'))
    await waitFor(() => expect(listSongsMock).toHaveBeenCalledTimes(2))
  })

  it('does not delete when the confirmation is declined', async () => {
    const fixture = makeFixtureSong({ id: 'song-del', title: 'Delete Me' })
    listSongsMock.mockResolvedValue([fixture])
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const user = userEvent.setup()
    render(<SongManager />)

    await screen.findByText('Delete Me')
    await user.click(screen.getByRole('button', { name: /delete delete me/i }))

    expect(window.confirm).toHaveBeenCalled()
    expect(deleteSongMock).not.toHaveBeenCalled()
  })

  it('surfaces a StorageError from listSongs as an inline error message instead of crashing', async () => {
    listSongsMock.mockRejectedValue(new StorageError('boom'))

    render(<SongManager />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/boom/i)
  })
})
