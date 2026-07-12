import { useAppStore } from '../../state/store'
import type { TextRole } from '../../state/types'
import type { Rect3D } from '../../types/song'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../types/song'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

type PositionField = 'x' | 'y' | 'width' | 'height'

const FIELD_BOUNDS: Record<PositionField, { min: number; max: number }> = {
  x: { min: 0, max: CANVAS_WIDTH },
  y: { min: 0, max: CANVAS_HEIGHT },
  width: { min: 1, max: CANVAS_WIDTH },
  height: { min: 1, max: CANVAS_HEIGHT },
}

interface TextBoxPositionControlProps {
  slideId: string
  role: TextRole
  position: Rect3D
  /** Human-readable label used for the fieldset legend and accessible input names, e.g. "Main text". */
  label: string
}

/**
 * X / Y / width / height numeric inputs for a single text element's bounding box.
 * Values are clamped to the fixed 1920x1080 canvas so the box can never be positioned
 * or sized outside the exportable area.
 */
export function TextBoxPositionControl({ slideId, role, position, label }: TextBoxPositionControlProps) {
  const updateSlidePosition = useAppStore((s) => s.updateSlidePosition)

  // onChange intentionally does NOT clamp: clamping every keystroke would corrupt
  // multi-digit entry mid-type. The value is clamped to the canvas bounds on blur,
  // once the user has finished typing.
  const handleChange = (field: PositionField, raw: number) => {
    if (Number.isNaN(raw)) return
    updateSlidePosition(slideId, role, { ...position, [field]: raw })
  }

  const handleBlur = (field: PositionField, raw: number) => {
    if (Number.isNaN(raw)) return
    const { min, max } = FIELD_BOUNDS[field]
    const clamped = clamp(raw, min, max)
    if (clamped !== raw) updateSlidePosition(slideId, role, { ...position, [field]: clamped })
  }

  return (
    <fieldset>
      <legend>{label} position</legend>

      <label>
        X
        <input
          type="number"
          aria-label={`${label} position x`}
          min={FIELD_BOUNDS.x.min}
          max={FIELD_BOUNDS.x.max}
          value={position.x}
          onChange={(e) => handleChange('x', e.target.valueAsNumber)}
          onBlur={(e) => handleBlur('x', e.target.valueAsNumber)}
        />
      </label>

      <label>
        Y
        <input
          type="number"
          aria-label={`${label} position y`}
          min={FIELD_BOUNDS.y.min}
          max={FIELD_BOUNDS.y.max}
          value={position.y}
          onChange={(e) => handleChange('y', e.target.valueAsNumber)}
          onBlur={(e) => handleBlur('y', e.target.valueAsNumber)}
        />
      </label>

      <label>
        Width
        <input
          type="number"
          aria-label={`${label} width`}
          min={FIELD_BOUNDS.width.min}
          max={FIELD_BOUNDS.width.max}
          value={position.width}
          onChange={(e) => handleChange('width', e.target.valueAsNumber)}
          onBlur={(e) => handleBlur('width', e.target.valueAsNumber)}
        />
      </label>

      <label>
        Height
        <input
          type="number"
          aria-label={`${label} height`}
          min={FIELD_BOUNDS.height.min}
          max={FIELD_BOUNDS.height.max}
          value={position.height}
          onChange={(e) => handleChange('height', e.target.valueAsNumber)}
          onBlur={(e) => handleBlur('height', e.target.valueAsNumber)}
        />
      </label>
    </fieldset>
  )
}
