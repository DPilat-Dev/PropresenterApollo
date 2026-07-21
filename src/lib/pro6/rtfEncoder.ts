import type { TextStyle } from '../../types/song'

/**
 * Escapes a single line of plain text for embedding inside RTF content text
 * (i.e. NOT inside a control word / group delimiter position).
 *
 * Rules:
 *  - `\` -> `\\`, `{` -> `\{`, `}` -> `\}` (RTF's three syntactic metacharacters)
 *  - Anything outside printable ASCII (0x20-0x7E) is escaped as `\uNNNN?`
 *    where NNNN is the DECIMAL UTF-16 code unit, using RTF's signed 16-bit
 *    convention: code units >= 32768 are written as `value - 65536` (i.e. the
 *    two's-complement signed 16-bit interpretation of the UTF-16 code unit).
 *    The trailing `?` is the required "ANSI fallback" byte for readers that
 *    can't handle \u escapes.
 *  - We iterate `charCodeAt` (UTF-16 code units), not codepoints, so a
 *    character outside the BMP (e.g. an emoji) naturally decomposes into its
 *    two surrogate halves, each emitted as its own `\uNNNN?` escape - which
 *    is exactly the RTF-correct way to represent it.
 *
 * Note: the task spec's worked example ("0xFF0C = 65292 -> \u-272?") doesn't
 * match the standard signed-16-bit formula (65292 - 65536 = -244, verified
 * against Node's own UTF-16 code unit output for the fullwidth comma). We
 * implement the mathematically-correct, RTF-spec-standard conversion
 * (value - 65536 for code units >= 32768) rather than the example's number,
 * since that's what real RTF readers (including ProPresenter) require.
 */
function escapeRtfText(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const code = text.charCodeAt(i)
    if (ch === '\\') {
      out += '\\\\'
    } else if (ch === '{') {
      out += '\\{'
    } else if (ch === '}') {
      out += '\\}'
    } else if (code >= 32 && code <= 126) {
      out += ch
    } else {
      const signed = code >= 32768 ? code - 65536 : code
      out += `\\u${signed}?`
    }
  }
  return out
}

/**
 * Produces a minimal, valid RTF document string for a slide's text.
 *
 * One input array entry = one paragraph, separated by `\par`. A trailing
 * `\par` is also emitted before the closing brace (common generator idiom,
 * harmless and widely tolerated/expected by RTF readers).
 *
 * Design decisions beyond the literal template in the spec:
 *  - We emit `\cf1` (selecting colortbl entry 1, the only color we define)
 *    right after `\fs<NN>`, since defining a colortbl entry without a `\cf`
 *    reference to it would leave the text at the RTF default (black) color
 *    regardless of `style.color`. This is a best-effort addition since the
 *    reverse-engineered spec's template didn't show it explicitly.
 *  - `\b`/`\i` are emitted when `style.bold`/`style.italic` are set, since
 *    TextStyle exposes them and omitting them would silently drop styling
 *    information available on the model.
 */
export function encodeRtf(lines: string[], style: TextStyle): string {
  const fontSize = Math.round(style.fontSizePt * 2) // RTF font size is in half-points
  const r = Math.round(style.color.r * 255)
  const g = Math.round(style.color.g * 255)
  const b = Math.round(style.color.b * 255)

  let lineSpacing = ''
  if (style.lineSpacingPct !== 100) {
    const twips = Math.round(style.fontSizePt * (style.lineSpacingPct / 100) * 20)
    lineSpacing = `\\sl${twips}\\slmult1 `
  }

  const boldTag = style.bold ? '\\b ' : ''
  const italicTag = style.italic ? '\\i ' : ''

  // Horizontal alignment. Left is RTF's implicit default, so an unset (or
  // explicitly 'left') align emits nothing - keeping output byte-identical to
  // before this field existed. Only center/right add a control word.
  let alignTag = ''
  if (style.align === 'center') alignTag = '\\qc '
  else if (style.align === 'right') alignTag = '\\qr '

  const paragraphs = lines.length > 0 ? lines : ['']
  const body = paragraphs.map(escapeRtfText).join('\\par ') + '\\par'

  const fontFamily = escapeRtfText(style.fontFamily)

  return (
    `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 ${fontFamily};}}` +
    `{\\colortbl;\\red${r}\\green${g}\\blue${b};}` +
    `\\f0\\fs${fontSize}${lineSpacing}${alignTag}\\cf1 ${boldTag}${italicTag}${body}}`
  )
}

function alignControl(align: TextStyle['align']): string {
  if (align === 'center') return '\\qc '
  if (align === 'right') return '\\qr '
  return ''
}

/**
 * RTF for a single text element whose paragraphs can each carry their own style
 * (font family, size, color, weight, alignment). Used by the interleaved
 * "Alternating" / "Two + Two" layouts, where original and translated lines -
 * with different colors and fonts - live in one text element. Builds a shared
 * font table and color table, then emits `\pardN…` per paragraph so each line
 * selects its own font/size/color/alignment.
 */
export function encodeRtfMixed(lines: ReadonlyArray<{ text: string; style: TextStyle }>): string {
  const segments = lines.length > 0 ? lines : [{ text: '', style: { fontFamily: 'Arial', fontSizePt: 60, lineSpacingPct: 100, color: { r: 1, g: 1, b: 1, a: 1 } } }]

  // Build de-duplicated font and color tables, remembering each style's index.
  const fonts: string[] = []
  const colors: string[] = []
  const fontIndexOf = (family: string) => {
    const i = fonts.indexOf(family)
    return i === -1 ? fonts.push(family) - 1 : i
  }
  const colorIndexOf = (c: TextStyle['color']) => {
    const key = `${Math.round(c.r * 255)} ${Math.round(c.g * 255)} ${Math.round(c.b * 255)}`
    const i = colors.indexOf(key)
    return (i === -1 ? colors.push(key) - 1 : i) + 1 // colortbl entry 0 is the empty default
  }

  const paragraphs = segments.map(({ text, style }) => {
    const fi = fontIndexOf(style.fontFamily)
    const ci = colorIndexOf(style.color)
    const fs = Math.round(style.fontSizePt * 2)
    const spacing =
      style.lineSpacingPct !== 100 ? `\\sl${Math.round(style.fontSizePt * (style.lineSpacingPct / 100) * 20)}\\slmult1 ` : ''
    const bold = style.bold ? '\\b ' : ''
    const italic = style.italic ? '\\i ' : ''
    return `\\pard ${alignControl(style.align)}${spacing}\\f${fi}\\fs${fs}\\cf${ci} ${bold}${italic}${escapeRtfText(text)}`
  })

  const fontTable = `{\\fonttbl${fonts.map((f, i) => `{\\f${i} ${escapeRtfText(f)};}`).join('')}}`
  const colorTable = `{\\colortbl;${colors.map((c) => `\\red${c.split(' ')[0]}\\green${c.split(' ')[1]}\\blue${c.split(' ')[2]};`).join('')}}`
  const body = paragraphs.join('\\par ') + '\\par'

  return `{\\rtf1\\ansi\\deff0${fontTable}${colorTable}${body}}`
}
