import { useState } from 'react'
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
import { ArrowLeftIcon, TrashIcon } from './components/icons'

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
      {feedback ?? 'Save'}
    </button>
  )
}

function EditorHeader() {
  const song = useAppStore((s) => s.song)

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
        <div>
          <div className="editor-header__title-row">
            <h1>{song.title}</h1>
            <span className="badge badge--outline">Draft</span>
          </div>
        </div>
      </div>

      <div className="editor-header__actions">
        <AutosaveIndicator />
        <button type="button" className="btn-danger" onClick={() => void handleDelete()}>
          <TrashIcon />
          Delete
        </button>
        <ExportButton />
        <SaveButton />
      </div>
    </header>
  )
}

function App() {
  const song = useAppStore((s) => s.song)

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
    <div className="app-shell">
      <EditorHeader />

      <div className="editor-body">
        <aside className="editor-sections">
          <LyricsInput />
          <SlideList />
        </aside>

        <main className="editor-canvas-col">
          <SlidePreviewCanvas />
          <SlideEditor />
        </main>

        <aside className="editor-style-col">
          <StylePanel />
        </aside>
      </div>
    </div>
  )
}

export default App
