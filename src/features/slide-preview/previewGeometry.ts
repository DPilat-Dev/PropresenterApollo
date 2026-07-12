import type { Rect3D } from '../../types/song'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../types/song'

export interface RectPercent {
  leftPct: number
  topPct: number
  widthPct: number
  heightPct: number
}

/**
 * Converts a pixel-space Rect3D (in the fixed 1920x1080 canvas coordinate
 * system) into percentages of the canvas, suitable for absolute-positioning
 * a responsive preview element with CSS left/top/width/height percentages.
 *
 * Note `z` (stacking) has no percentage analogue and is dropped; see
 * `percentToPixel` for the inverse.
 */
export function pixelToPercent(
  rect: Rect3D,
  canvasW: number = CANVAS_WIDTH,
  canvasH: number = CANVAS_HEIGHT,
): RectPercent {
  return {
    leftPct: (rect.x / canvasW) * 100,
    topPct: (rect.y / canvasH) * 100,
    widthPct: (rect.width / canvasW) * 100,
    heightPct: (rect.height / canvasH) * 100,
  }
}

/**
 * Inverse of `pixelToPercent`. Since percentages carry no `z` information,
 * callers that need to preserve the original `z` should pass it explicitly
 * (defaults to 0).
 */
export function percentToPixel(
  percent: RectPercent,
  canvasW: number = CANVAS_WIDTH,
  canvasH: number = CANVAS_HEIGHT,
  z: number = 0,
): Rect3D {
  return {
    x: (percent.leftPct / 100) * canvasW,
    y: (percent.topPct / 100) * canvasH,
    z,
    width: (percent.widthPct / 100) * canvasW,
    height: (percent.heightPct / 100) * canvasH,
  }
}
