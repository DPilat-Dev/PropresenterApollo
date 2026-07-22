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

export type HorizontalAlignment = 'left' | 'center' | 'right'

export interface TextStyle {
  fontFamily: string
  fontSizePt: number
  /** 100 = normal RTF single-spacing; omitted from RTF output when at default. */
  lineSpacingPct: number
  color: RGBAColor
  bold?: boolean
  italic?: boolean
  /** Horizontal paragraph alignment. Undefined means "left" for RTF/pro6 output
   * (so untouched slides export byte-identically to before this field existed);
   * the on-screen preview treats undefined as centered to match the design. */
  align?: HorizontalAlignment
  /** Drop shadow on the text. Undefined/false = no shadow (pro6 drawingShadow=false). */
  textShadow?: boolean
  /** Outline/stroke on the text. Undefined/false = no stroke (pro6 drawingStroke=false). */
  textOutline?: boolean
}

export type VerticalAlignment = 'top' | 'center' | 'bottom'

export interface TextElementState {
  id: string
  role: 'main' | 'translation'
  plainText: string
  position: Rect3D
  style: TextStyle
  /**
   * Point size actually used for rendering and export, set by auto-layout when
   * the content would otherwise overflow the 1080px-tall canvas. `style.fontSizePt`
   * stays the user's chosen size (the maximum); this is the shrunk-to-fit result.
   * Absent whenever the content fits at full size, so exports are unchanged.
   */
  fittedFontSizePt?: number
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

/**
 * The seven slide-composition presets offered in the STYLE > Layout tab. These
 * describe how a slide's original / translated / third-language text is
 * arranged relative to each other. `original-translation` is the default and
 * matches the historical stacked lower-third layout.
 */
export type SlideLayoutPreset =
  | 'original-translation'
  | 'two-plus-two'
  | 'alternating'
  | 'side-by-side'
  | 'original-only'
  | 'translation-only'

export interface SlideLayoutPresetMeta {
  key: SlideLayoutPreset
  name: string
  description: string
}

export const SLIDE_LAYOUT_PRESETS: ReadonlyArray<SlideLayoutPresetMeta> = [
  { key: 'original-translation', name: 'Original + Translation', description: 'One line original, one line translated below' },
  { key: 'two-plus-two', name: 'Two + Two', description: 'Two lines original, then two lines translated' },
  { key: 'alternating', name: 'Alternating', description: 'Original and translation alternate line by line' },
  { key: 'side-by-side', name: 'Side by Side', description: 'Original on left, translation on right' },
  { key: 'original-only', name: 'Original Only', description: 'Show only the source language' },
  { key: 'translation-only', name: 'Translation Only', description: 'Show only the translated language' },
]

export interface Song {
  id: string
  title: string
  /** Author / artist shown under the title in the editor header. */
  artist: string
  rawLyrics: string
  splitSettings: SplitSettings
  slides: Slide[]
  groups: SlideGroup[]
  targetLanguage: string | null
  /** Source (original) language code, shown in the Layout tab's Translation section. */
  sourceLanguage: string
  /**
   * Per-line translations saved with the song, so re-splitting after a reload
   * refills translations from here instead of re-hitting the translation API.
   */
  translationCache: TranslationCache
  /** Active slide-composition preset (STYLE > Layout). */
  layout: SlideLayoutPreset
  /** Color used for a third-language line when a layout that shows one is active. */
  thirdLanguageColor: RGBAColor
  /** Whether the song has been "published" (drives the header badge/actions). */
  published: boolean
  /** When true, each slide's main-text box height is sized to its line count and
   * vertically centered, so the box hugs its content (see fitBoxHeight). When
   * false, the box keeps whatever height/position the user set manually. */
  autoFitBox: boolean
  createdAt: string
  updatedAt: string
}

// Auto-fit tuning: a line's rendered box is ~1.35x the font size, plus a little
// vertical breathing room above+below the text block. These are deliberate
// approximations for a CSS/pro6 layout we don't measure exactly.
const AUTO_FIT_LINE_FACTOR = 1.35
const AUTO_FIT_VERTICAL_PADDING = 40

/**
 * Estimates the box height (in canvas px) needed to hold `lineCount` lines of
 * text at the given point size and line spacing. Pure; used both when slides
 * are first created and when auto-fit is re-applied after a typography change.
 */
export function fitBoxHeight(lineCount: number, fontSizePt: number, lineSpacingPct: number): number {
  const perLine = fontSizePt * AUTO_FIT_LINE_FACTOR * (lineSpacingPct / 100)
  return Math.round(Math.max(1, lineCount) * perLine + AUTO_FIT_VERTICAL_PADDING)
}

/** The point size to actually draw/export `el` at: the shrunk-to-fit size when
 * auto-layout had to reduce it, otherwise the user's chosen size. */
export function renderFontSize(el: TextElementState): number {
  return el.fittedFontSizePt ?? el.style.fontSizePt
}

/** The top-left `y` (canvas px) that vertically centers a box of the given height. */
export function centeredBoxY(height: number): number {
  return Math.round((CANVAS_HEIGHT - height) / 2)
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
// Warm gold used for translated text in the reference design (#FFD27A).
export const DEFAULT_TRANSLATION_TEXT_COLOR: RGBAColor = { r: 1, g: 0.823529, b: 0.478431, a: 1 }
// Soft blue used for a third-language line in the reference design (#8ECDE6).
export const DEFAULT_THIRD_LANGUAGE_COLOR: RGBAColor = { r: 0.556863, g: 0.803922, b: 0.901961, a: 1 }
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
  color: DEFAULT_TRANSLATION_TEXT_COLOR,
}
