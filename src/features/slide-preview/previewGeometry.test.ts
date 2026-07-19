import { describe, expect, it } from 'vitest'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../types/song'
import type { Rect3D } from '../../types/song'
import { percentToPixel, pixelToPercent } from './previewGeometry'

describe('previewGeometry', () => {
  describe('pixelToPercent', () => {
    it('maps a rect covering the full canvas to 0%/0%/100%/100%', () => {
      const rect: Rect3D = { x: 0, y: 0, z: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
      expect(pixelToPercent(rect)).toEqual({ leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 })
    })

    it('maps the default main text position to known percentages', () => {
      const rect: Rect3D = { x: 160, y: 560, z: 0, width: 1600, height: 300 }
      const pct = pixelToPercent(rect)

      expect(pct.leftPct).toBeCloseTo((160 / 1920) * 100, 9)
      expect(pct.topPct).toBeCloseTo((560 / 1080) * 100, 9)
      expect(pct.widthPct).toBeCloseTo((1600 / 1920) * 100, 9)
      expect(pct.heightPct).toBeCloseTo((300 / 1080) * 100, 9)
    })

    it('respects custom canvas dimensions', () => {
      const rect: Rect3D = { x: 50, y: 50, z: 0, width: 100, height: 100 }
      expect(pixelToPercent(rect, 200, 200)).toEqual({ leftPct: 25, topPct: 25, widthPct: 50, heightPct: 50 })
    })
  })

  describe('percentToPixel', () => {
    it('is the inverse of pixelToPercent for a full-canvas rect', () => {
      const pct = { leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 }
      expect(percentToPixel(pct)).toEqual({ x: 0, y: 0, z: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
    })

    it('preserves an explicitly-passed z', () => {
      const pct = { leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 }
      expect(percentToPixel(pct, CANVAS_WIDTH, CANVAS_HEIGHT, 7)).toEqual({
        x: 0,
        y: 0,
        z: 7,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      })
    })
  })

  describe('round-trip', () => {
    it('pixelToPercent then percentToPixel returns the original rect within epsilon', () => {
      const rects: Rect3D[] = [
        { x: 0, y: 0, z: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        { x: 160, y: 700, z: 3, width: 1600, height: 300 },
        { x: 160, y: 900, z: 0, width: 1600, height: 120 },
        { x: 333, y: 217, z: -2, width: 987, height: 654 },
      ]

      for (const rect of rects) {
        const pct = pixelToPercent(rect)
        const roundTripped = percentToPixel(pct, CANVAS_WIDTH, CANVAS_HEIGHT, rect.z)

        expect(roundTripped.x).toBeCloseTo(rect.x, 6)
        expect(roundTripped.y).toBeCloseTo(rect.y, 6)
        expect(roundTripped.width).toBeCloseTo(rect.width, 6)
        expect(roundTripped.height).toBeCloseTo(rect.height, 6)
        expect(roundTripped.z).toBe(rect.z)
      }
    })
  })
})
