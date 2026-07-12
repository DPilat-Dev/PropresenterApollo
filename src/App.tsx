import './App.css'
import { LyricsInput } from './features/lyrics-input/LyricsInput'
import { SlideList } from './features/slide-list/SlideList'
import { SlidePreviewCanvas } from './features/slide-preview/SlidePreviewCanvas'
import { SlideEditor } from './features/slide-editor/SlideEditor'
import { TranslationPanel } from './features/translation/TranslationPanel'
import { ExportButton } from './features/export/ExportButton'
import { SongManager } from './features/song-manager/SongManager'
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
  const songTitle = useAppStore((s) => s.song?.title ?? null)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__title">
          <h1>Lyrics → ProPresenter 6</h1>
          {songTitle && <span className="app-header__song-title">{songTitle}</span>}
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
