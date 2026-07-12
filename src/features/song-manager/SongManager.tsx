import { useEffect, useState } from 'react'
import { useAppStore } from '../../state/store'
import { deleteSong, listSongs, loadSong, StorageError } from '../../storage/songRepository'
import type { Song } from '../../types/song'

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Panel for managing songs saved locally (IndexedDB): lists them, creates a
 * new one, loads one into the store, or deletes one.
 *
 * Known minor gap: this list only refreshes after an action initiated from
 * this panel (new/load/delete). It does not live-refresh when the debounced
 * autosave elsewhere in the app updates `updatedAt` in the background - that
 * would require polling or a cross-store event, which isn't worth the
 * complexity for this internal tool.
 */
export function SongManager() {
  const [songs, setSongs] = useState<Song[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const refresh = async () => {
    try {
      const list = await listSongs()
      setSongs(list)
      setError(null)
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to list songs.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleCreate = async () => {
    const title = newTitle.trim()
    if (title.length === 0) return
    useAppStore.getState().newSong(title)
    setNewTitle('')
    setIsCreating(false)
    await refresh()
  }

  const handleLoad = async (id: string) => {
    try {
      const song = await loadSong(id)
      if (song) {
        useAppStore.getState().setSong(song)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to load song.')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`)
    if (!confirmed) return
    try {
      await deleteSong(id)
      setError(null)
      await refresh()
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete song.')
    }
  }

  return (
    <section aria-labelledby="song-manager-heading" className="song-manager">
      <h2 id="song-manager-heading">Saved Songs</h2>

      {error && (
        <p role="alert" className="song-manager__error">
          {error}
        </p>
      )}

      {isCreating ? (
        <div className="song-manager__new-form">
          <label htmlFor="new-song-title">New song title</label>
          <input
            id="new-song-title"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Song title"
            data-testid="new-song-title-input"
          />
          <button type="button" onClick={() => void handleCreate()} disabled={newTitle.trim().length === 0}>
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false)
              setNewTitle('')
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setIsCreating(true)} data-testid="new-song-button">
          New Song
        </button>
      )}

      {songs.length === 0 ? (
        <p>No saved songs yet.</p>
      ) : (
        <ul className="song-manager__list" style={{ listStyle: 'none', padding: 0 }}>
          {songs.map((song) => (
            <li key={song.id} className="song-manager__item">
              <button
                type="button"
                className="song-manager__load-button"
                onClick={() => void handleLoad(song.id)}
                data-testid={`load-song-${song.id}`}
              >
                <span className="song-manager__title">{song.title}</span>
                <span className="song-manager__updated-at">{formatUpdatedAt(song.updatedAt)}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(song.id, song.title)}
                aria-label={`Delete ${song.title}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
