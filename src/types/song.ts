// Canvas is fixed at 1920x1080 internally regardless of the user's screen size;
// all Rect3D values live in this pixel space and are serialized verbatim into pro6.
export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

export interface Rect3D {
  x: number
  y: number
  z: number
  width: number
  height: number
}

export interface RGBAColor {
  r: number
  g: number
  b: number
  a: number
}

export interface TextStyle {
  fontFamily: string
  fontSizePt: number
  /** 100 = normal RTF single-spacing; omitted from RTF output when at default. */
  lineSpacingPct: number
  color: RGBAColor
  bold?: boolean
  italic?: boolean
}

export type VerticalAlignment = 'top' | 'center' | 'bottom'

export interface TextElementState {
  id: string
  role: 'main' | 'translation'
  plainText: string
  position: Rect3D
  style: TextStyle
  fillColor: RGBAColor
  verticalAlignment: VerticalAlignment
  opacity: number
  rotation: number
}

export interface Slide {
  id: string
  label: string
  notes: string
  enabled: boolean
  backgroundColor: RGBAColor
  mainText: TextElementState
  translationText: TextElementState | null
  order: number
}

export interface SlideGroup {
  id: string
  name: string
  color: RGBAColor
  slideIds: string[]
}

export interface SplitSettings {
  linesPerSlide: number
  skipBlankLines: boolean
}

export interface Song {
  id: string
  title: string
  rawLyrics: string
  splitSettings: SplitSettings
  slides: Slide[]
  groups: SlideGroup[]
  targetLanguage: string | null
  createdAt: string
  updatedAt: string
}

export interface TranslationCacheEntry {
  sourceText: string
  sourceLang: string
  targetLang: string
  translatedText: string
  fetchedAt: string
  /** Once true, bulk re-translate must skip this entry so manual edits aren't clobbered. */
  overridden: boolean
}

export type TranslationCache = Record<string, TranslationCacheEntry>

export function translationCacheKey(sourceLang: string, targetLang: string, sourceText: string): string {
  return `${sourceLang}|${targetLang}|${sourceText}`
}

// Lower-third layout: main text sits above translation text, stacked with a clear
// 20px gap between their boxes (no overlap) and a 40px margin above the canvas
// bottom edge (matches PLACEMENT_MARGIN in songSlice.ts). Main text keeps its
// original 300px height (room for ~3 lines at 60pt); translation's box is sized
// for its own (larger) default font — see DEFAULT_TRANSLATION_TEXT_STYLE below.
export const DEFAULT_MAIN_TEXT_POSITION: Rect3D = { x: 160, y: 560, z: 0, width: 1600, height: 300 }
export const DEFAULT_TRANSLATION_TEXT_POSITION: Rect3D = { x: 160, y: 880, z: 0, width: 1600, height: 160 }

export const DEFAULT_TEXT_COLOR: RGBAColor = { r: 1, g: 1, b: 1, a: 1 }
export const DEFAULT_FILL_COLOR: RGBAColor = { r: 1, g: 1, b: 1, a: 0 }
export const DEFAULT_SLIDE_BACKGROUND: RGBAColor = { r: 0, g: 0, b: 0, a: 1 }

export const DEFAULT_MAIN_TEXT_STYLE: TextStyle = {
  fontFamily: 'Arial',
  fontSizePt: 60,
  lineSpacingPct: 100,
  color: DEFAULT_TEXT_COLOR,
}

// 48pt (80% of the main text's 60pt) reads as clearly related to the main text
// rather than a jarring drop-off (the old 36pt was only 60% of main). Kept a
// little below 60 rather than equal so a same-width two-line translation still
// comfortably fits its 160px-tall box without crowding.
export const DEFAULT_TRANSLATION_TEXT_STYLE: TextStyle = {
  fontFamily: 'Arial',
  fontSizePt: 48,
  lineSpacingPct: 100,
  color: DEFAULT_TEXT_COLOR,
}
