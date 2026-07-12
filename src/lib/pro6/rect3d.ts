import type { Rect3D } from '../../types/song'

/** Serializes a Rect3D into pro6's bracketed string form: "{x y z width height}". */
export function serializeRect3D(r: Rect3D): string {
  return `{${r.x} ${r.y} ${r.z} ${r.width} ${r.height}}`
}

/** Parses pro6's "{x y z width height}" string form back into a Rect3D. */
export function parseRect3D(s: string): Rect3D {
  const inner = s.trim().replace(/^\{/, '').replace(/\}$/, '')
  const parts = inner.trim().split(/\s+/).map(Number)
  const [x, y, z, width, height] = parts
  return { x, y, z, width, height }
}
