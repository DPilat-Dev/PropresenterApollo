import './App.css'
import { LyricsInput } from './features/lyrics-input/LyricsInput'
import { SlideList } from './features/slide-list/SlideList'
import { SlidePreviewCanvas } from './features/slide-preview/SlidePreviewCanvas'
import { SlideEditor } from './features/slide-editor/SlideEditor'
import { TranslationPanel } from './features/translation/TranslationPanel'
import { ExportButton } from './features/export/ExportButton'
import { SongManager } from './features/song-manager/SongManager'
import { HomePage } from './features/home/HomePage'
import { QuickEditPanel } from './features/quick-edit/QuickEditPanel'
import { useDebouncedAutosave } from './hooks/useDebouncedAutosave'
import { useAppStore } from './state/store'

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
      <header className="app-header">
        <div className="app-header__title">
          <h1>Lyrics → ProPresenter 6</h1>
          <span className="app-header__song-title">{song.title}</span>
        </div>
        <div className="app-header__actions">
          <AutosaveIndicator />
          <ExportButton />
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <SongManager />
          <LyricsInput />
          <SlideList />
          <QuickEditPanel />
        </aside>

        <main className="app-main">
          <SlidePreviewCanvas />
          <SlideEditor />
          <TranslationPanel />
        </main>
      </div>
    </div>
  )
}

export default App
