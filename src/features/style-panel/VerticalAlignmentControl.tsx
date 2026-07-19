import { useAppStore } from '../../state/store'
import type { TextRole } from '../../state/types'
import type { VerticalAlignment } from '../../types/song'

interface VerticalAlignmentControlProps {
  slideId: string
  role: TextRole
  verticalAlignment: VerticalAlignment
  /** Human-readable label used for the accessible input name, e.g. "Main text". */
  label: string
}

/**
 * Per-slide vertical alignment select for a single text element. Split out
 * of the old SpacingControls so placement concerns (this + QuickEditPanel's
 * bulk placement + TextBoxPositionControl) live together under the Layout
 * tab, separate from typography concerns (Type tab).
 */
export function VerticalAlignmentControl({ slideId, role, verticalAlignment, label }: VerticalAlignmentControlProps) {
  const updateSlideVerticalAlignment = useAppStore((s) => s.updateSlideVerticalAlignment)

  return (
    <label className="style-panel__field">
      Vertical alignment
      <select
        aria-label={`${label} vertical alignment`}
        value={verticalAlignment}
        onChange={(e) => updateSlideVerticalAlignment(slideId, role, e.target.value as VerticalAlignment)}
      >
        <option value="top">Top</option>
        <option value="center">Center</option>
        <option value="bottom">Bottom</option>
      </select>
    </label>
  )
}
