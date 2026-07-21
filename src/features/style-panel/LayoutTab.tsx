import type { CSSProperties } from 'react'
import { useAppStore } from '../../state/store'
import { SLIDE_LAYOUT_PRESETS } from '../../types/song'
import { TranslationPanel } from '../translation/TranslationPanel'

const MIN_LINES_PER_SLIDE = 1
const MAX_LINES_PER_SLIDE = 8

const SOURCE_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Mandarin Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
]

/**
 * STYLE panel "Layout" tab: the seven slide-composition presets, the max
 * lines-per-slide split control, and the translation controls. Slide text
 * boxes are auto-sized and vertically centered automatically (see the store's
 * auto-fit logic), so there are no manual box/position controls here.
 */
export function LayoutTab() {
  const song = useAppStore((s) => s.song)
  const importLyrics = useAppStore((s) => s.importLyrics)
  const setSongLayout = useAppStore((s) => s.setSongLayout)
  const setSongSourceLanguage = useAppStore((s) => s.setSongSourceLanguage)

  const activeLayout = song?.layout ?? 'original-translation'
  const linesPerSlide = song?.splitSettings.linesPerSlide ?? 2
  const canAdjustLines = Boolean(song && song.rawLyrics.trim().length > 0)
  const fillPct = ((linesPerSlide - MIN_LINES_PER_SLIDE) / (MAX_LINES_PER_SLIDE - MIN_LINES_PER_SLIDE)) * 100

  const handleLinesChange = (value: number) => {
    if (!song) return
    importLyrics(song.rawLyrics, value)
  }

  return (
    <div className="style-tab" data-testid="layout-tab">
      <h3>Slide Layout</h3>
      <div className="layout-presets" role="radiogroup" aria-label="Slide layout preset">
        {SLIDE_LAYOUT_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            role="radio"
            aria-checked={activeLayout === preset.key}
            className={`layout-preset${activeLayout === preset.key ? ' layout-preset--active' : ''}`}
            onClick={() => setSongLayout(preset.key)}
          >
            <span className="layout-preset__name">{preset.name}</span>
            <span className="layout-preset__desc">{preset.description}</span>
          </button>
        ))}
      </div>

      <h3 className="style-tab__section-label--spaced">Max Lines Per Slide: {linesPerSlide}</h3>
      <input
        type="range"
        aria-label="Max lines per slide"
        min={MIN_LINES_PER_SLIDE}
        max={MAX_LINES_PER_SLIDE}
        step={1}
        value={linesPerSlide}
        disabled={!canAdjustLines}
        style={{ '--range-fill': `${fillPct}%` } as CSSProperties}
        onChange={(e) => handleLinesChange(Number(e.target.value))}
      />
      <p className="style-tab__hint">Re-splits the song&apos;s lyrics into slides of this many lines each.</p>

      <h3 className="style-tab__section-label--spaced">Translation</h3>
      <label className="style-panel__field" htmlFor="source-language">
        Source Language
      </label>
      <select
        id="source-language"
        value={song?.sourceLanguage ?? 'en'}
        onChange={(e) => setSongSourceLanguage(e.target.value)}
      >
        {SOURCE_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>

      <TranslationPanel />
    </div>
  )
}
