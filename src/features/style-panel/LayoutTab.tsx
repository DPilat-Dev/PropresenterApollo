import { useEffect, useState } from 'react'
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
  const targetLanguage = useAppStore((s) => s.targetLanguage)
  const translateAllSlides = useAppStore((s) => s.translateAllSlides)

  const activeLayout = song?.layout ?? 'original-translation'
  const linesPerSlide = song?.splitSettings.linesPerSlide ?? 2
  const canAdjustLines = Boolean(song && song.rawLyrics.trim().length > 0)

  // The slider updates a local value immediately for responsiveness, but the
  // (destructive) re-split is debounced so dragging doesn't re-split on every
  // step. After re-splitting we re-apply translations - cached slide texts
  // resolve instantly, only genuinely-new splits hit the network - so tweaking
  // the split no longer wipes out the song's translations.
  const [pendingLines, setPendingLines] = useState(linesPerSlide)
  useEffect(() => setPendingLines(linesPerSlide), [linesPerSlide])

  useEffect(() => {
    if (!song || pendingLines === song.splitSettings.linesPerSlide) return
    const raw = song.rawLyrics
    const hadTranslation = song.slides.some((s) => s.translationText !== null)
    const timer = setTimeout(() => {
      importLyrics(raw, pendingLines)
      if (targetLanguage && hadTranslation) void translateAllSlides()
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLines])

  const fillPct = ((pendingLines - MIN_LINES_PER_SLIDE) / (MAX_LINES_PER_SLIDE - MIN_LINES_PER_SLIDE)) * 100

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

      <h3 className="style-tab__section-label--spaced">Max Lines Per Slide: {pendingLines}</h3>
      <input
        type="range"
        aria-label="Max lines per slide"
        min={MIN_LINES_PER_SLIDE}
        max={MAX_LINES_PER_SLIDE}
        step={1}
        value={pendingLines}
        disabled={!canAdjustLines}
        style={{ '--range-fill': `${fillPct}%` } as CSSProperties}
        onChange={(e) => setPendingLines(Number(e.target.value))}
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
