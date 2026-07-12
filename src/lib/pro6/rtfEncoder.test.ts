import { describe, expect, it } from 'vitest'
import { encodeRtf } from './rtfEncoder'
import type { TextStyle } from '../../types/song'

const baseStyle: TextStyle = {
  fontFamily: 'Arial',
  fontSizePt: 60,
  lineSpacingPct: 100,
  color: { r: 1, g: 1, b: 1, a: 1 },
}

function countUnescapedBraceBalance(rtf: string): number {
  // Walk the string tracking brace depth, skipping escaped \{ and \}.
  let depth = 0
  for (let i = 0; i < rtf.length; i++) {
    if (rtf[i] === '\\' && (rtf[i + 1] === '{' || rtf[i + 1] === '}' || rtf[i + 1] === '\\')) {
      i++ // skip escaped char
      continue
    }
    if (rtf[i] === '{') depth++
    if (rtf[i] === '}') depth--
  }
  return depth
}

describe('encodeRtf', () => {
  it('produces a well-formed brace-balanced document', () => {
    const rtf = encodeRtf(['hello world'], baseStyle)
    expect(rtf.startsWith('{\\rtf1')).toBe(true)
    expect(rtf.endsWith('}')).toBe(true)
    expect(countUnescapedBraceBalance(rtf)).toBe(0)
  })

  it('escapes a literal backslash as \\\\', () => {
    const rtf = encodeRtf(['a\\b'], baseStyle)
    expect(rtf).toContain('a\\\\b')
  })

  it('escapes literal { and } without breaking group nesting', () => {
    const rtf = encodeRtf(['{hi}'], baseStyle)
    expect(rtf).toContain('\\{hi\\}')
    expect(countUnescapedBraceBalance(rtf)).toBe(0)
  })

  it('escapes accented Latin characters as \\uNNNN?', () => {
    const rtf = encodeRtf(['café, naïve'], baseStyle)
    // é = U+00E9 = 233, ï = U+00EF = 239
    expect(rtf).toContain('\\u233?')
    expect(rtf).toContain('\\u239?')
  })

  it('encodes a non-Latin script (Japanese) string without corruption', () => {
    const text = '主よ、みもとに近づかん'
    const rtf = encodeRtf([text], baseStyle)
    // Every character must have been escaped away - the raw multi-byte
    // characters should not appear literally in the RTF source.
    expect(rtf.includes(text)).toBe(false)
    // And the whole document should be plain ASCII, since every non-ASCII
    // code unit gets escaped.
    expect(/^[\x00-\x7F]*$/.test(rtf)).toBe(true)
  })

  it('encodes an emoji as a UTF-16 surrogate pair, two \\u escapes', () => {
    const rtf = encodeRtf(['🎵'], baseStyle)
    // U+1F3B5 = surrogate pair 0xD83C (55356), 0xDFB5 (57269).
    // Both code units are >= 32768, so per the signed 16-bit RTF convention:
    // 55356 - 65536 = -10180, 57269 - 65536 = -8267.
    expect(rtf).toContain('\\u-10180?\\u-8267?')
  })

  it('produces valid (non-malformed) RTF for empty string input', () => {
    const rtf = encodeRtf([''], baseStyle)
    expect(countUnescapedBraceBalance(rtf)).toBe(0)
    expect(rtf).toMatch(/\\par}$/)

    const rtfFromEmptyArray = encodeRtf([], baseStyle)
    expect(countUnescapedBraceBalance(rtfFromEmptyArray)).toBe(0)
    expect(rtfFromEmptyArray).toMatch(/\\par}$/)
  })

  it('omits line-spacing control words at 100% (default)', () => {
    const rtf = encodeRtf(['line'], { ...baseStyle, lineSpacingPct: 100 })
    expect(rtf).not.toContain('\\sl')
    expect(rtf).not.toContain('\\slmult1')
  })

  it('emits \\sl and \\slmult1 when line spacing is not 100%', () => {
    const rtf = encodeRtf(['line'], { ...baseStyle, lineSpacingPct: 150, fontSizePt: 60 })
    // twips = round(60 * 1.5 * 20) = 1800
    expect(rtf).toContain('\\sl1800\\slmult1')
  })

  it('joins multiple lines with \\par', () => {
    const rtf = encodeRtf(['line one', 'line two', 'line three'], baseStyle)
    expect(rtf).toContain('line one\\par line two\\par line three\\par')
  })

  it('encodes font size as half-points', () => {
    const rtf = encodeRtf(['x'], { ...baseStyle, fontSizePt: 36 })
    expect(rtf).toContain('\\fs72')
  })

  it('encodes color as 0-255 RGB in colortbl', () => {
    const rtf = encodeRtf(['x'], { ...baseStyle, color: { r: 1, g: 0, b: 0.5, a: 1 } })
    expect(rtf).toContain('\\red255\\green0\\blue128')
  })
})
