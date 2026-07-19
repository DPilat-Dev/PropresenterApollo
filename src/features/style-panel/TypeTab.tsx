import { useAppStore } from '../../state/store'
import type { TextRole } from '../../state/types'
import type { Slide } from '../../types/song'
import { SpacingControls } from '../slide-editor/SpacingControls'

// Small curated list rather than a free-text field - keeps the dropdown
// useful while still flowing straight through to the existing plain-string
// `TextStyle.fontFamily` field (and from there into the RTF font table).
const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Trebuchet MS',
  'Calibri',
  'Garamond',
  'Courier New',
  'Impact',
]

interface TypeTabProps {
  slide: Slide
  role: TextRole
}

/** STYLE panel "Type" tab: typography controls for the active text role. */
export function TypeTab({ slide, role }: TypeTabProps) {
  const updateSlideStyle = useAppStore((s) => s.updateSlideStyle)
  const element = role === 'main' ? slide.mainText : slide.translationText
  const label = role === 'main' ? 'Main text' : 'Translation text'

  if (!element) {
    return <p className="style-tab__hint">This slide has no translation text yet.</p>
  }

  const familyOptions = FONT_FAMILIES.includes(element.style.fontFamily)
    ? FONT_FAMILIES
    : [element.style.fontFamily, ...FONT_FAMILIES]

  return (
    <div className="style-tab" data-testid="type-tab">
      <h3>Font Family</h3>
      <select
        aria-label={`${label} font family`}
        value={element.style.fontFamily}
        onChange={(e) => updateSlideStyle(slide.id, role, { fontFamily: e.target.value })}
      >
        {familyOptions.map((family) => (
          <option key={family} value={family}>
            {family}
          </option>
        ))}
      </select>

      <h3 className="style-tab__section-label--spaced">Font Weight</h3>
      <select
        aria-label={`${label} font weight`}
        value={element.style.bold ? 'bold' : 'regular'}
        onChange={(e) => updateSlideStyle(slide.id, role, { bold: e.target.value === 'bold' })}
      >
        <option value="regular">Regular</option>
        <option value="bold">Bold</option>
      </select>

      <h3 className="style-tab__section-label--spaced">Size &amp; Spacing</h3>
      <SpacingControls slideId={slide.id} role={role} style={element.style} label={label} />
    </div>
  )
}
