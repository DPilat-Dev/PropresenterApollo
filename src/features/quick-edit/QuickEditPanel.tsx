import { useState } from 'react'
import { useAppStore } from '../../state/store'
import type { VerticalAlignment } from '../../types/song'

const ALIGNMENT_OPTIONS: ReadonlyArray<{ value: VerticalAlignment; label: string }> = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
]

/**
 * Bulk placement control: moves *every* slide's main (or translation) text box
 * to the top, center, or bottom of the canvas at once (updating `position.y` and
 * `verticalAlignment` together so the text is anchored consistently within its
 * newly-placed box), instead of opening each slide individually via the
 * per-slide `SpacingControls`/`TextBoxPositionControl`. Self-contained - reads
 * `song` and the `updateAllSlidesPlacement` action directly from the store,
 * no props.
 */
export function QuickEditPanel() {
  const song = useAppStore((s) => s.song)
  const updateAllSlidesPlacement = useAppStore((s) => s.updateAllSlidesPlacement)

  // These selects don't represent one "current" alignment shared by every slide
  // (slides may already differ from each other), so each is treated as an
  // uncontrolled command trigger rather than a bound value display: after firing
  // an update, bump a `key` to force React to remount the <select> back to its
  // placeholder option. This also guarantees re-picking the SAME option twice in
  // a row still dispatches a change event, which a value-bound select wouldn't do.
  const [mainKey, setMainKey] = useState(0)
  const [translationKey, setTranslationKey] = useState(0)

  if (!song || song.slides.length === 0) return null

  const hasTranslation = song.slides.some((slide) => slide.translationText !== null)

  const handleMainChange = (value: string) => {
    if (value === '') return
    updateAllSlidesPlacement('main', value as VerticalAlignment)
    setMainKey((k) => k + 1)
  }

  const handleTranslationChange = (value: string) => {
    if (value === '') return
    updateAllSlidesPlacement('translation', value as VerticalAlignment)
    setTranslationKey((k) => k + 1)
  }

  return (
    <fieldset className="quick-edit-panel">
      <legend>Quick Edit</legend>

      <label>
        Main text
        <select
          key={mainKey}
          aria-label="Main text vertical alignment for all slides"
          defaultValue=""
          onChange={(e) => handleMainChange(e.target.value)}
        >
          <option value="" disabled>
            Set all to…
          </option>
          {ALIGNMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {hasTranslation && (
        <div className="quick-edit-panel__translation-row">
          <label>
            Translation text
            <select
              key={translationKey}
              aria-label="Translation text vertical alignment for all slides"
              defaultValue=""
              onChange={(e) => handleTranslationChange(e.target.value)}
            >
              <option value="" disabled>
                Set all to…
              </option>
              {ALIGNMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <p className="quick-edit-panel__hint">Applies to slides with translation text.</p>
        </div>
      )}
    </fieldset>
  )
}
