import { useEffect, useState } from 'react'
import './App.css'
import { LyricsInput } from './features/lyrics-input/LyricsInput'
import { SlideList } from './features/slide-list/SlideList'
import { SlidePreviewCanvas } from './features/slide-preview/SlidePreviewCanvas'
import { SlideEditor } from './features/slide-editor/SlideEditor'
import { StylePanel } from './features/style-panel/StylePanel'
import { ExportButton } from './features/export/ExportButton'
import { HomePage } from './features/home/HomePage'
import { useDebouncedAutosave } from './hooks/useDebouncedAutosave'
import { useAppStore } from './state/store'
import { deleteSong, saveSong, StorageError } from './storage/songRepository'
import { ArrowLeftIcon, ClockIcon, GlobeIcon, PlusIcon, SaveIcon, TrashIcon } from './components/icons'

const AUTOSAVE_STATUS_LABEL: Record<string, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
}

function AutosaveIndicator() {
  const { status, errorMessage } = useDebouncedAutosave()
  const label = AUTOSAVE_STATUS_LABEL[status]

  if (!label) return null

  return (
    <span
      className={`autosave-indicator autosave-indicator--${status}`}
      role={status === 'error' ? 'alert' : 'status'}
      data-testid="autosave-status"
      title={status === 'error' ? errorMessage : undefined}
    >
      {label}
    </span>
  )
}

/** Navigates back to the home/song-list screen. Not a store action (no other
 * part of the app needs to "unload" the current song), so this dispatches
 * straight through Zustand's own setState rather than growing the typed
 * SongSlice action surface for a one-off UI concern. */
function goHome() {
  useAppStore.setState({ song: null, selectedSlideId: null })
}

function SaveButton() {
  const song = useAppStore((s) => s.song)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSave = async () => {
    if (!song) return
    setFeedback(null)
    try {
      await saveSong(song)
      setFeedback('Saved')
    } catch (err) {
      setFeedback(err instanceof StorageError ? err.message : 'Save failed')
    }
  }

  return (
    <button type="button" className="btn-primary" onClick={() => void handleSave()} title="Save now (autosave also runs automatically)">
      <SaveIcon width={15} height={15} />
      {feedback ?? 'Save'}
    </button>
  )
}

/** Modal wrapper hosting the lyrics paste/import form, opened from the editor
 * when the song already has slides and the user wants to re-import. */
function LyricsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit lyrics" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Edit lyrics</h2>
          <button type="button" className="btn-ghost modal__close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="modal__note">Re-importing replaces the current slides with a fresh split of the pasted lyrics.</p>
        <LyricsInput onImported={onClose} />
      </div>
    </div>
  )
}

function EditorHeader() {
  const song = useAppStore((s) => s.song)
  const setSongArtist = useAppStore((s) => s.setSongArtist)
  const setSongPublished = useAppStore((s) => s.setSongPublished)
  const [historyNote, setHistoryNote] = useState(false)

  const handleDelete = async () => {
    if (!song) return
    const confirmed = window.confirm(`Delete "${song.title}"? This cannot be undone.`)
    if (!confirmed) return
    try {
      await deleteSong(song.id)
    } catch {
      // Best-effort: even if the delete fails we still return the user home,
      // where SongManager's own list will surface any persistence errors.
    }
    goHome()
  }

  if (!song) return null

  return (
    <header className="editor-header">
      <div className="editor-header__left">
        <button type="button" className="editor-header__back" aria-label="Back to songs" onClick={goHome}>
          <ArrowLeftIcon />
        </button>
        <div className="editor-header__titles">
          <div className="editor-header__title-row">
            <h1>{song.title}</h1>
            {song.published ? (
              <span className="badge badge--published">
                <GlobeIcon width={12} height={12} /> Published
              </span>
            ) : (
              <span className="badge badge--outline">Draft</span>
            )}
          </div>
          <input
            className="editor-header__artist"
            aria-label="Artist"
            placeholder="Add artist…"
            value={song.artist}
            onChange={(e) => setSongArtist(e.target.value)}
          />
        </div>
      </div>

      <div className="editor-header__actions">
        <AutosaveIndicator />
        <div className="editor-header__history-wrap">
          <button type="button" className="btn-ghost" onClick={() => setHistoryNote((v) => !v)} title="Version history">
            <ClockIcon width={15} height={15} />
            History
          </button>
          {historyNote && (
            <span className="editor-header__coming-soon" role="status">
              Version history is coming soon.
            </span>
          )}
        </div>
        <button type="button" className="btn-danger" onClick={() => void handleDelete()}>
          <TrashIcon width={15} height={15} />
          Delete
        </button>
        <button type="button" onClick={() => setSongPublished(!song.published)}>
          <GlobeIcon width={15} height={15} />
          {song.published ? 'Unpublish' : 'Publish'}
        </button>
        <ExportButton />
        <SaveButton />
      </div>
    </header>
  )
}

function App() {
  const song = useAppStore((s) => s.song)
  const hasSlides = Boolean(song && song.slides.length > 0)
  const [lyricsOpen, setLyricsOpen] = useState(false)

  // No song loaded yet: show the welcoming landing view instead of the
  // (mostly-empty) editor shell. Creating or loading a song from there sets
  // `song` in the store, which flips this component straight into the
  // editor below - no routing involved.
  if (!song) {
    return (
      <div className="app-shell">
        <HomePage />
      </div>
    )
  }

  return (
    <div className="app-shell app-shell--editor">
      <EditorHeader />

      <div className="editor-body">
        <aside className="editor-rail editor-rail--left">
          {hasSlides ? (
            <>
              <SlideList />
              <button type="button" className="btn-ghost editor-rail__lyrics-btn" onClick={() => setLyricsOpen(true)}>
                <PlusIcon width={14} height={14} />
                Edit lyrics
              </button>
            </>
          ) : (
            <LyricsInput />
          )}
        </aside>

        <main className="editor-stage">
          <div className="editor-stage__canvas">
            <SlidePreviewCanvas />
          </div>
          {hasSlides && (
            <div className="editor-stage__edit">
              <SlideEditor />
            </div>
          )}
        </main>

        <aside className="editor-rail editor-rail--right">
          <StylePanel />
        </aside>
      </div>

      {lyricsOpen && <LyricsModal onClose={() => setLyricsOpen(false)} />}
    </div>
  )
}

export default App
