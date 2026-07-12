import { describe, expect, it } from 'vitest'
import { parseColor, serializeColor } from './colorFormat'
import type { RGBAColor } from '../../types/song'

describe('color format serialization', () => {
  it('serializes to space-separated float string', () => {
    const color: RGBAColor = { r: 1, g: 1, b: 1, a: 1 }
    expect(serializeColor(color)).toBe('1 1 1 1')
  })

  it('parses back to an equivalent RGBAColor', () => {
    expect(parseColor('1 1 1 1')).toEqual({ r: 1, g: 1, b: 1, a: 1 })
  })

  it('round-trips arbitrary float values', () => {
    const color: RGBAColor = { r: 0.5, g: 0.25, b: 0.75, a: 0.1 }
    expect(parseColor(serializeColor(color))).toEqual(color)
  })

  it('round-trips black opaque', () => {
    const color: RGBAColor = { r: 0, g: 0, b: 0, a: 1 }
    expect(parseColor(serializeColor(color))).toEqual(color)
  })
})
