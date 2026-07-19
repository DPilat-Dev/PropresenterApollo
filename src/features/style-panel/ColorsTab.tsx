import { useAppStore } from '../../state/store'
import type { RGBAColor, Slide } from '../../types/song'

function toHex(c: RGBAColor): string {
  const toByte = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${toByte(c.r)}${toByte(c.g)}${toByte(c.b)}`
}

function hexToRgb(hex: string): Pick<RGBAColor, 'r' | 'g' | 'b'> {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255
  return { r, g, b }
}

interface ColorFieldProps {
  label: string
  color: RGBAColor
  onChange: (next: RGBAColor) => void
}

function ColorField({ label, color, onChange }: ColorFieldProps) {
  const hex = toHex(color)
  return (
    <div className="color-field-row">
      <span className="color-field-row__label">{label}</span>
      <span className="color-field-row__hex">{hex.toUpperCase()}</span>
      <input
        type="color"
        aria-label={`${label} color`}
        value={hex}
        onChange={(e) => onChange({ ...color, ...hexToRgb(e.target.value) })}
      />
    </div>
  )
}

interface ColorsTabProps {
  slide: Slide
}

/**
 * STYLE panel "Colors" tab: wires the existing `mainText.style.color` /
 * `translationText.style.color` / `Slide.backgroundColor` fields (which had
 * no UI before this pass) to real color pickers. Third-language color and
 * text effects (shadow/outline) would need new data-model fields that are
 * out of scope for this visual-redesign pass, so they're a clearly-labeled
 * placeholder rather than dead controls.
 */
export function ColorsTab({ slide }: ColorsTabProps) {
  const updateSlideStyle = useAppStore((s) => s.updateSlideStyle)
  const updateSlideBackgroundColor = useAppStore((s) => s.updateSlideBackgroundColor)

  return (
    <div className="style-tab" data-testid="colors-tab">
      <h3>Text Colors</h3>

      <ColorField
        label="Original Text"
        color={slide.mainText.style.color}
        onChange={(next) => updateSlideStyle(slide.id, 'main', { color: next })}
      />

      {slide.translationText ? (
        <ColorField
          label="Translated Text"
          color={slide.translationText.style.color}
          onChange={(next) => updateSlideStyle(slide.id, 'translation', { color: next })}
        />
      ) : (
        <p className="style-tab__hint">Add a translation to set its text color.</p>
      )}

      <ColorField
        label="Background"
        color={slide.backgroundColor}
        onChange={(next) => updateSlideBackgroundColor(slide.id, next)}
      />

      <h3 className="style-tab__section-label--spaced">More Colors</h3>
      <p className="style-tab__placeholder">
        Third-language text color and text effects (shadow / outline) are coming in a future update.
      </p>
    </div>
  )
}
