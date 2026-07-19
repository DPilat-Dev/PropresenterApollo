import { SongManager } from '../song-manager/SongManager'

const FEATURES: { title: string; description: string }[] = [
  {
    title: 'Import',
    description: 'Paste or upload lyrics and they’re automatically split into slides.',
  },
  {
    title: 'Edit & Align',
    description: 'Fine-tune slide text, spacing, and vertical alignment slide by slide.',
  },
  {
    title: 'Translate',
    description: 'Auto-translate lyrics into a second language for bilingual slides.',
  },
  {
    title: 'Export',
    description: 'Download a real .pro6 file, ready to import straight into ProPresenter 6.',
  },
]

/**
 * Landing view shown when there is no active song in the store. Introduces
 * the tool and hands off to the existing `SongManager` panel (unmodified)
 * for both starting a new song and resuming a previously saved one, so this
 * component doesn't duplicate any IndexedDB or store-creation logic.
 */
export function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-heading">
        <h1 id="home-hero-heading">Lyrics → ProPresenter 6</h1>
        <p className="home-hero__tagline">
          Paste in song lyrics, auto-split them into slides, tweak the spacing and alignment, optionally
          auto-translate, and export a real ProPresenter 6 (.pro6) file — all in your browser. No account,
          no server, no upload.
        </p>
      </section>

      <section className="home-features" aria-labelledby="home-features-heading">
        <h2 id="home-features-heading">How it works</h2>
        <ul className="home-features__list">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <strong>{feature.title}</strong>
              <span>{feature.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <SongManager />
    </div>
  )
}
