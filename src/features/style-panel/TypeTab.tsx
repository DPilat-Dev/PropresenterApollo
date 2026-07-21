import type { CSSProperties } from 'react'
import { useAppStore } from '../../state/store'
import type { TextRole } from '../../state/types'
import type { HorizontalAlignment, Slide } from '../../types/song'
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from '../../components/icons'

// Small curated list rather than a free-text field - keeps the dropdown
// useful while still flowing straight through to the existing plain-string
// `TextStyle.fontFamily` field (and from there into the RTF font table).
const FONT_FAMILIES = [
  'Inter',
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

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 120
const MIN_LINE_HEIGHT = 100
const MAX_LINE_HEIGHT = 300

const ALIGNMENTS: ReadonlyArray<{ value: HorizontalAlignment; label: string; Icon: typeof AlignLeftIcon }> = [
  { value: 'left', label: 'Align left', Icon: AlignLeftIcon },
  { value: 'center', label: 'Align center', Icon: AlignCenterIcon },
  { value: 'right', label: 'Align right', Icon: AlignRightIcon },
]

function fillPercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100
}

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

  const fontSize = element.style.fontSizePt
  const lineHeightPct = element.style.lineSpacingPct
  const activeAlign: HorizontalAlignment = element.style.align ?? 'center'

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

      <h3 className="style-tab__section-label--spaced">Font Size: {fontSize}px</h3>
      <input
        type="range"
        aria-label={`${label} font size`}
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        step={1}
        value={fontSize}
        style={{ '--range-fill': `${fillPercent(fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE)}%` } as CSSProperties}
        onChange={(e) => updateSlideStyle(slide.id, role, { fontSizePt: Number(e.target.value) })}
      />

      <h3 className="style-tab__section-label--spaced">Font Weight</h3>
      <select
        aria-label={`${label} font weight`}
        value={element.style.bold ? 'bold' : 'regular'}
        onChange={(e) => updateSlideStyle(slide.id, role, { bold: e.target.value === 'bold' })}
      >
        <option value="regular">Regular</option>
        <option value="bold">Bold</option>
      </select>

      <h3 className="style-tab__section-label--spaced">Alignment</h3>
      <div className="segmented style-tab__align" role="group" aria-label={`${label} horizontal alignment`}>
        {ALIGNMENTS.map(({ value, label: alignLabel, Icon }) => (
          <button
            key={value}
            type="button"
            className="segmented__item"
            aria-label={alignLabel}
            aria-pressed={activeAlign === value}
            onClick={() => updateSlideStyle(slide.id, role, { align: value })}
          >
            <Icon />
          </button>
        ))}
      </div>

      <h3 className="style-tab__section-label--spaced">Line Height: {(lineHeightPct / 100).toFixed(1)}</h3>
      <input
        type="range"
        aria-label={`${label} line height`}
        min={MIN_LINE_HEIGHT}
        max={MAX_LINE_HEIGHT}
        step={10}
        value={lineHeightPct}
        style={{ '--range-fill': `${fillPercent(lineHeightPct, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT)}%` } as CSSProperties}
        onChange={(e) => updateSlideStyle(slide.id, role, { lineSpacingPct: Number(e.target.value) })}
      />
    </div>
  )
}
