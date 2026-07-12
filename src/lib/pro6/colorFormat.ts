import type { RGBAColor } from '../../types/song'

/** Serializes an RGBAColor to pro6's "r g b a" space-separated float string (0-1 range). */
export function serializeColor(c: RGBAColor): string {
  return `${c.r} ${c.g} ${c.b} ${c.a}`
}

/** Parses a pro6 "r g b a" space-separated float string back into an RGBAColor. */
export function parseColor(s: string): RGBAColor {
  const parts = s.trim().split(/\s+/).map(Number)
  const [r, g, b, a] = parts
  return { r, g, b, a }
}
