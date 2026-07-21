import type { SlideLayoutPreset } from '../../types/song'

export type LineRole = 'main' | 'translation'

export interface InterleavedLine {
  text: string
  role: LineRole
}

/** True for the layouts that weave original and translated lines into a single
 * block (Alternating / Two + Two) rather than stacking two separate boxes. */
export function isInterleavedLayout(layout: SlideLayoutPreset): boolean {
  return layout === 'alternating' || layout === 'two-plus-two'
}

/** How many consecutive lines of each language before switching: 1 for
 * Alternating (O,T,O,T…), 2 for Two + Two (O,O,T,T,O,O,T,T…). */
export function interleaveGroupSize(layout: SlideLayoutPreset): number {
  return layout === 'two-plus-two' ? 2 : 1
}

/**
 * Weaves original and translated lines together in groups of `groupSize`:
 * takes up to `groupSize` original lines, then up to `groupSize` translated
 * lines, and repeats until both are exhausted (either language running out
 * early just stops contributing). Pure.
 */
export function interleaveLines(mainText: string, translationText: string, groupSize: number): InterleavedLine[] {
  const mainLines = mainText.split('\n')
  const translationLines = translationText.split('\n')
  const group = Math.max(1, groupSize)
  const out: InterleavedLine[] = []
  let mi = 0
  let ti = 0
  while (mi < mainLines.length || ti < translationLines.length) {
    for (let k = 0; k < group && mi < mainLines.length; k++) out.push({ text: mainLines[mi++], role: 'main' })
    for (let k = 0; k < group && ti < translationLines.length; k++) out.push({ text: translationLines[ti++], role: 'translation' })
  }
  return out
}
