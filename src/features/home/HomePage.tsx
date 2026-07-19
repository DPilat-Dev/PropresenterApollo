import { useAppStore } from '../../state/store'
import { AppHeader } from './AppHeader'
import { SongManager } from '../song-manager/SongManager'
import { PlusIcon } from '../../components/icons'

/**
 * Landing view shown when there is no active song in the store: a top nav
 * (AppHeader), a hero banner introducing this tool (this app's own copy -
 * not the visual reference mockup's), and the song list/management panel
 * (SongManager) below it.
 */
export function HomePage() {
  const handleHeroNewSong = () => {
    useAppStore.getState().newSong('Untitled Song')
  }

  return (
    <div className="home-page">
      <AppHeader />

      <div className="home-page__content">
        <section className="home-hero" aria-labelledby="home-hero-heading">
          <h1 id="home-hero-heading">Turn lyrics into ProPresenter slides.</h1>
          <p className="home-hero__tagline">
            Paste in song lyrics, split them into slides, fine-tune spacing and alignment, optionally
            auto-translate, and export a real ProPresenter 6 (.pro6) file — all in your browser. No account,
            no server, no upload.
          </p>
          <button
            type="button"
            className="btn-primary home-hero__cta"
            onClick={handleHeroNewSong}
            data-testid="hero-new-song-button"
          >
            <PlusIcon width={14} height={14} />
            New Song
          </button>
        </section>

        <SongManager />
      </div>
    </div>
  )
}
