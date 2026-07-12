import { describe, expect, it } from 'vitest'
import { parseRect3D, serializeRect3D } from './rect3d'
import type { Rect3D } from '../../types/song'

describe('rect3d serialization', () => {
  it('serializes to bracketed space-separated form', () => {
    const rect: Rect3D = { x: 160, y: 700, z: 0, width: 1600, height: 300 }
    expect(serializeRect3D(rect)).toBe('{160 700 0 1600 300}')
  })

  it('parses back to an equivalent Rect3D', () => {
    expect(parseRect3D('{160 700 0 1600 300}')).toEqual({ x: 160, y: 700, z: 0, width: 1600, height: 300 })
  })

  it('round-trips fractional values', () => {
    const rect: Rect3D = { x: 12.5, y: -3.25, z: 0, width: 999.99, height: 1.1 }
    expect(parseRect3D(serializeRect3D(rect))).toEqual(rect)
  })

  it('round-trips negative coordinates', () => {
    const rect: Rect3D = { x: -100, y: -50, z: 0, width: 200, height: 200 }
    expect(parseRect3D(serializeRect3D(rect))).toEqual(rect)
  })
})
