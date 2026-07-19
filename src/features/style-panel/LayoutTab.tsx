import type { CSSProperties } from 'react'
import { useAppStore } from '../../state/store'
import type { TextRole } from '../../state/types'
import type { Slide } from '../../types/song'
import { QuickEditPanel } from '../quick-edit/QuickEditPanel'
import { TranslationPanel } from '../translation/TranslationPanel'
import { TextBoxPositionControl } from '../slide-editor/TextBoxPositionControl'
import { VerticalAlignmentControl } from './VerticalAlignmentControl'

const MIN_LINES_PER_SLIDE = 1
const MAX_LINES_PER_SLIDE = 8

interface LayoutTabProps {
  /** null when no slide is selected yet - the song-level controls below (Quick Edit,
   * translation, max lines per slide) still work without one; only "Position" needs it. */
  slide: Slide | null
  role: TextRole
}

/**
 * STYLE panel "Layout" tab: composition/placement controls. Re-uses the
 * existing "max lines per slide" split setting, per-role position/vertical
 * alignment controls, the bulk Quick Edit placement tool, and the
 * translation language picker - all real, pre-existing functionality
 * relocated here rather than duplicated. The 7 slide-layout composition
 * presets from the reference mockup would need a new data-model concept and
 * are out of scope for this visual-redesign pass, so that section is a
 * clearly-labeled placeholder instead of dead controls.
 */
export function LayoutTab({ slide, role }: LayoutTabProps) {
  const song = useAppStore((s) => s.song)
  const importLyrics = useAppStore((s) => s.importLyrics)

  const element = slide ? (role === 'main' ? slide.mainText : slide.translationText) : null
  const label = role === 'main' ? 'Main text' : 'Translation text'

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
      <p className="style-tab__placeholder">
        Composition presets (Original + Translation, Side by Side, etc.) are coming in a future update.
      </p>

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

      <h3 className="style-tab__section-label--spaced">Position</h3>
      {slide && element ? (
        <>
          <VerticalAlignmentControl
            slideId={slide.id}
            role={role}
            verticalAlignment={element.verticalAlignment}
            label={label}
          />
          <TextBoxPositionControl slideId={slide.id} role={role} position={element.position} label={label} />
        </>
      ) : (
        <p className="style-tab__hint">{slide ? 'Add a translation to position it.' : 'Select a slide to position its text.'}</p>
      )}

      <QuickEditPanel />

      <TranslationPanel />
    </div>
  )
}
