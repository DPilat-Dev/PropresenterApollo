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

interface EffectToggleProps {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}

function EffectToggle({ label, checked, onChange }: EffectToggleProps) {
  return (
    <label className="effect-toggle-row">
      <span className="effect-toggle-row__label">{label}</span>
      <input
        type="checkbox"
        className="switch"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

interface ColorsTabProps {
  slide: Slide
}

/**
 * STYLE panel "Colors" tab: wires the per-slide `mainText`/`translationText`
 * text colors and `Slide.backgroundColor`, the song-level third-language color,
 * and the shadow/outline effects toggles (which fan out to every slide's text).
 */
export function ColorsTab({ slide }: ColorsTabProps) {
  const song = useAppStore((s) => s.song)
  const updateAllSlidesStyle = useAppStore((s) => s.updateAllSlidesStyle)
  const updateAllSlidesBackgroundColor = useAppStore((s) => s.updateAllSlidesBackgroundColor)
  const setThirdLanguageColor = useAppStore((s) => s.setThirdLanguageColor)
  const setAllSlidesTextEffect = useAppStore((s) => s.setAllSlidesTextEffect)

  // Effects are stored per text element but presented as one global toggle;
  // reflect the currently-selected slide's main text as the representative state.
  const shadowOn = Boolean(slide.mainText.style.textShadow)
  const outlineOn = Boolean(slide.mainText.style.textOutline)

  return (
    <div className="style-tab" data-testid="colors-tab">
      <p className="style-tab__scope">Applies to all slides</p>
      <h3>Text Colors</h3>

      <ColorField
        label="Original Text"
        color={slide.mainText.style.color}
        onChange={(next) => updateAllSlidesStyle('main', { color: next })}
      />

      {slide.translationText ? (
        <ColorField
          label="Translated Text"
          color={slide.translationText.style.color}
          onChange={(next) => updateAllSlidesStyle('translation', { color: next })}
        />
      ) : (
        <div className="color-field-row color-field-row--muted">
          <span className="color-field-row__label">Translated Text</span>
          <span className="color-field-row__hint">Add a translation</span>
        </div>
      )}

      {song && (
        <ColorField
          label="Third Language"
          color={song.thirdLanguageColor}
          onChange={(next) => setThirdLanguageColor(next)}
        />
      )}

      <ColorField
        label="Background"
        color={slide.backgroundColor}
        onChange={(next) => updateAllSlidesBackgroundColor(next)}
      />

      <h3 className="style-tab__section-label--spaced">Effects</h3>
      <EffectToggle label="Text Shadow" checked={shadowOn} onChange={(v) => setAllSlidesTextEffect('shadow', v)} />
      <EffectToggle label="Text Outline" checked={outlineOn} onChange={(v) => setAllSlidesTextEffect('outline', v)} />
    </div>
  )
}
