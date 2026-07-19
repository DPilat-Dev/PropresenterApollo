import { useAppStore } from '../../state/store'
import type { TextRole } from '../../state/types'
import type { TextStyle } from '../../types/song'

export const MIN_FONT_SIZE_PT = 12
export const MAX_FONT_SIZE_PT = 200
export const MIN_LINE_SPACING_PCT = 50
export const MAX_LINE_SPACING_PCT = 200

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface SpacingControlsProps {
  slideId: string
  role: TextRole
  style: TextStyle
  /** Human-readable label used for the fieldset legend and accessible input names, e.g. "Main text". */
  label: string
}

/**
 * Font size / line spacing controls for a single text element (main or
 * translation) on the currently selected slide. Vertical alignment lives in
 * `VerticalAlignmentControl` instead (Layout tab), since it's a placement
 * concern rather than a typography one.
 */
export function SpacingControls({ slideId, role, style, label }: SpacingControlsProps) {
  const updateSlideStyle = useAppStore((s) => s.updateSlideStyle)

  // onChange intentionally does NOT clamp: clamping every keystroke would corrupt
  // multi-digit entry (e.g. typing "80" starts with "8", which is below the 12pt
  // minimum and would get force-clamped to 12 before the second digit even lands).
  // The value is committed on blur instead, once the user has finished typing.
  const handleFontSizeChange = (raw: number) => {
    if (Number.isNaN(raw)) return
    updateSlideStyle(slideId, role, { fontSizePt: raw })
  }

  const handleFontSizeBlur = (raw: number) => {
    if (Number.isNaN(raw)) return
    const clamped = clamp(raw, MIN_FONT_SIZE_PT, MAX_FONT_SIZE_PT)
    if (clamped !== raw) updateSlideStyle(slideId, role, { fontSizePt: clamped })
  }

  const handleLineSpacingChange = (raw: number) => {
    if (Number.isNaN(raw)) return
    updateSlideStyle(slideId, role, { lineSpacingPct: raw })
  }

  const handleLineSpacingBlur = (raw: number) => {
    if (Number.isNaN(raw)) return
    const clamped = clamp(raw, MIN_LINE_SPACING_PCT, MAX_LINE_SPACING_PCT)
    if (clamped !== raw) updateSlideStyle(slideId, role, { lineSpacingPct: clamped })
  }

  return (
    <fieldset>
      <legend>{label} spacing</legend>

      <label>
        Font size (pt)
        <input
          type="number"
          aria-label={`${label} font size`}
          min={MIN_FONT_SIZE_PT}
          max={MAX_FONT_SIZE_PT}
          value={style.fontSizePt}
          onChange={(e) => handleFontSizeChange(e.target.valueAsNumber)}
          onBlur={(e) => handleFontSizeBlur(e.target.valueAsNumber)}
        />
      </label>

      <label>
        Line spacing (%)
        <input
          type="number"
          aria-label={`${label} line spacing`}
          min={MIN_LINE_SPACING_PCT}
          max={MAX_LINE_SPACING_PCT}
          step={5}
          value={style.lineSpacingPct}
          onChange={(e) => handleLineSpacingChange(e.target.valueAsNumber)}
          onBlur={(e) => handleLineSpacingBlur(e.target.valueAsNumber)}
        />
      </label>
    </fieldset>
  )
}
