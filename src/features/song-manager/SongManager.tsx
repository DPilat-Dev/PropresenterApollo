import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../state/store'
import { deleteSong, listSongs, loadSong, StorageError } from '../../storage/songRepository'
import type { Song } from '../../types/song'
import { FileIcon, GlobeIcon, GridIcon, ListIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons'

type SortKey = 'updatedAt' | 'title'
type ViewMode = 'grid' | 'list'

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  zh: 'Mandarin',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  ru: 'Russian',
  hi: 'Hindi',
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function matchesQuery(song: Song, query: string): boolean {
  if (query.trim().length === 0) return true
  const q = query.trim().toLowerCase()
  return song.title.toLowerCase().includes(q) || song.rawLyrics.toLowerCase().includes(q)
}

/**
 * Panel for managing songs saved locally (IndexedDB): search, sort, grid/list
 * view, multi-select bulk delete, single-song create/load/delete.
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

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const visibleSongs = useMemo(() => {
    const filtered = songs.filter((s) => matchesQuery(s, query))
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return sorted
  }, [songs, query, sortKey])

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    const confirmed = window.confirm(`Delete ${selectedIds.size} selected song(s)? This cannot be undone.`)
    if (!confirmed) return
    try {
      for (const id of selectedIds) {
        await deleteSong(id)
      }
      setError(null)
      setSelectedIds(new Set())
      setIsSelectMode(false)
      await refresh()
    } catch (err) {
      setError(err instanceof StorageError ? err.message : 'Failed to delete songs.')
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCardActivate = (song: Song) => {
    if (isSelectMode) {
      toggleSelected(song.id)
    } else {
      void handleLoad(song.id)
    }
  }

  return (
    <section aria-labelledby="song-manager-heading" className="song-manager">
      {error && (
        <p role="alert" className="song-manager__error">
          {error}
        </p>
      )}

      <div className="song-toolbar">
        <div className="song-toolbar__search">
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            aria-label="Search songs"
            placeholder="Search title, lyrics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="segmented song-toolbar__view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className="segmented__item"
            aria-pressed={viewMode === 'grid'}
            aria-label="Grid view"
            onClick={() => setViewMode('grid')}
          >
            <GridIcon />
          </button>
          <button
            type="button"
            className="segmented__item"
            aria-pressed={viewMode === 'list'}
            aria-label="List view"
            onClick={() => setViewMode('list')}
          >
            <ListIcon />
          </button>
        </div>

        <select aria-label="Sort songs" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="updatedAt">Recently Edited</option>
          <option value="title">Title A–Z</option>
        </select>

        <button
          type="button"
          className={isSelectMode ? 'btn-primary' : ''}
          onClick={() => {
            setIsSelectMode((v) => !v)
            setSelectedIds(new Set())
          }}
        >
          {isSelectMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {isSelectMode && (
        <div className="song-bulk-bar">
          <span>{selectedIds.size} selected</span>
          <button type="button" className="btn-danger" disabled={selectedIds.size === 0} onClick={() => void handleBulkDelete()}>
            <TrashIcon />
            Delete selected
          </button>
        </div>
      )}

      <div className="song-list-header">
        <h2 id="song-manager-heading" className="song-list-header__heading">
          Your Songs <span className="song-list-header__count">{visibleSongs.length}</span>
        </h2>

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
            <button type="button" className="btn-primary" onClick={() => void handleCreate()} disabled={newTitle.trim().length === 0}>
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
            <PlusIcon width={14} height={14} />
            New Song
          </button>
        )}
      </div>

      {songs.length === 0 ? (
        <p>No saved songs yet.</p>
      ) : visibleSongs.length === 0 ? (
        <p>No songs match your search.</p>
      ) : (
        <ul className={viewMode === 'grid' ? 'song-grid' : 'song-grid song-grid--list'} style={{ listStyle: 'none', padding: 0 }}>
          {visibleSongs.map((song) => {
            const isSelected = selectedIds.has(song.id)
            return (
              <li key={song.id} className={isSelected ? 'song-card song-card--selected' : 'song-card'}>
                {isSelectMode && (
                  <input
                    type="checkbox"
                    className="song-card__checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(song.id)}
                    aria-label={`Select ${song.title}`}
                  />
                )}
                <button
                  type="button"
                  className="song-card__body"
                  onClick={() => handleCardActivate(song)}
                  data-testid={`load-song-${song.id}`}
                >
                  <span className="song-card__icon" aria-hidden="true">
                    <FileIcon />
                  </span>
                  <span className="song-card__title">{song.title}</span>
                  <span className="song-manager__updated-at">{formatUpdatedAt(song.updatedAt)}</span>
                  <span className="song-card__badges">
                    {song.targetLanguage && (
                      <span className="badge badge--outline">
                        <GlobeIcon width={12} height={12} /> EN → {LANGUAGE_LABELS[song.targetLanguage] ?? song.targetLanguage}
                      </span>
                    )}
                    <span className="badge">{song.slides.length} slide{song.slides.length === 1 ? '' : 's'}</span>
                  </span>
                </button>
                {!isSelectMode && (
                  <button
                    type="button"
                    className="song-card__delete"
                    onClick={() => void handleDelete(song.id, song.title)}
                    aria-label={`Delete ${song.title}`}
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
