import { useAppStore } from '../../state/store'
import { AppHeader } from './AppHeader'
import { SongManager } from '../song-manager/SongManager'
import { GitHubIcon, PlusIcon } from '../../components/icons'

/** Public repo, linked from the footer. */
const REPO_URL = 'https://github.com/DPilat-Dev/PropresenterApollo'

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
          <h1 id="home-hero-heading">Worship slides in seconds, in any language.</h1>
          <p className="home-hero__tagline">
            Paste lyrics, split them into slides, translate them line by line into any language, and build
            beautiful ProPresenter-ready slides — all in your browser. No account, no server, no upload.
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

      <footer className="home-footer">
        <div className="home-footer__inner">
          <p className="home-footer__brand">
            <strong>Glossa</strong> — named for <em>glossa</em>, tongue or language.
          </p>
          <p className="home-footer__note">
            Runs entirely in your browser. Songs are saved to this device, never uploaded.
          </p>
          <nav className="home-footer__links" aria-label="Project links">
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
              <GitHubIcon width={15} height={15} aria-hidden="true" />
              Source on GitHub
            </a>
            <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noreferrer noopener">
              Report an issue
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
