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
 * `song` and the placement actions directly from the store, no props.
 *
 * The "clamp translation under main text" checkbox is local UI-only state (not
 * persisted to the song): when checked, the Main text select drives BOTH boxes
 * together via `updateAllSlidesPlacementClamped` (translation position is derived
 * from main's placement, so the independent Translation text row is hidden -
 * picking it separately wouldn't make sense once it's clamped).
 */
export function QuickEditPanel() {
  const song = useAppStore((s) => s.song)
  const updateAllSlidesPlacement = useAppStore((s) => s.updateAllSlidesPlacement)
  const updateAllSlidesPlacementClamped = useAppStore((s) => s.updateAllSlidesPlacementClamped)

  // These selects don't represent one "current" alignment shared by every slide
  // (slides may already differ from each other), so each is treated as an
  // uncontrolled command trigger rather than a bound value display: after firing
  // an update, bump a `key` to force React to remount the <select> back to its
  // placeholder option. This also guarantees re-picking the SAME option twice in
  // a row still dispatches a change event, which a value-bound select wouldn't do.
  const [mainKey, setMainKey] = useState(0)
  const [translationKey, setTranslationKey] = useState(0)
  const [clampTranslation, setClampTranslation] = useState(false)

  if (!song || song.slides.length === 0) return null

  const hasTranslation = song.slides.some((slide) => slide.translationText !== null)

  const handleMainChange = (value: string) => {
    if (value === '') return
    if (clampTranslation && hasTranslation) {
      updateAllSlidesPlacementClamped(value as VerticalAlignment)
    } else {
      updateAllSlidesPlacement('main', value as VerticalAlignment)
    }
    setMainKey((k) => k + 1)
  }

  const handleTranslationChange = (value: string) => {
    if (value === '') return
    updateAllSlidesPlacement('translation', value as VerticalAlignment)
    setTranslationKey((k) => k + 1)
  }

  return (
    <section aria-labelledby="quick-edit-heading" className="quick-edit-panel">
      <h2 id="quick-edit-heading">Quick Edit</h2>

      <fieldset>
        <legend>Set all slides</legend>

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
          <div className="quick-edit-panel__clamp-row">
            <label className="quick-edit-panel__checkbox-label">
              <input
                type="checkbox"
                checked={clampTranslation}
                onChange={(e) => setClampTranslation(e.target.checked)}
              />
              Clamp translation under main text
            </label>
            <p className="quick-edit-panel__hint">Keeps translation directly below main text when aligning.</p>
          </div>
        )}

        {hasTranslation && !clampTranslation && (
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
    </section>
  )
}
