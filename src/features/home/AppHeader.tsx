import { useState } from 'react'
import { useAppStore } from '../../state/store'
import { MusicNoteIcon, PlusIcon, SettingsIcon } from '../../components/icons'

const INERT_NAV_ITEMS = ['Community', 'Team', 'Templates']

/**
 * Top navigation bar shown on the home/song-list screen. "Songs" is the one
 * real destination this app has; Community/Team/Templates are styled but
 * inert placeholders (no backend/accounts exist to back them - see the
 * product brief). Settings has nothing to configure yet, so it's a no-op
 * affordance rather than a fabricated settings screen.
 *
 * The "+ New Song" button here is a quick one-click create (default title,
 * jumps straight into the editor) - a second, deliberate "name it as you
 * create it" flow still lives in `SongManager`'s own inline form.
 */
export function AppHeader() {
  const [activePlaceholder, setActivePlaceholder] = useState<string | null>(null)

  const handleQuickNewSong = () => {
    useAppStore.getState().newSong('Untitled Song')
  }

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo" aria-hidden="true">
          <MusicNoteIcon />
        </span>
        <span className="app-header__name">Verse2Slide</span>
      </div>

      <nav className="app-header__nav" aria-label="Primary">
        <span className="app-header__nav-item app-header__nav-item--active" aria-current="page">
          Songs
        </span>
        {INERT_NAV_ITEMS.map((item) => (
          <button
            key={item}
            type="button"
            className="app-header__nav-item app-header__nav-item--inert"
            onClick={() => setActivePlaceholder(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="app-header__actions">
        {activePlaceholder && (
          <span className="app-header__coming-soon" role="status">
            {activePlaceholder}: coming soon
          </span>
        )}
        <button
          type="button"
          className="app-header__icon-btn"
          aria-label="Settings (nothing to configure yet)"
          disabled
          title="Nothing to configure yet"
        >
          <SettingsIcon />
        </button>
        <button type="button" className="btn-primary" onClick={handleQuickNewSong} data-testid="header-new-song-button">
          <PlusIcon width={14} height={14} />
          New Song
        </button>
      </div>
    </header>
  )
}
