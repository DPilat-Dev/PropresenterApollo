import { v4 as uuidv4 } from 'uuid'
import type { Slide, SlideGroup, SlideLayoutPreset, Song, TextElementState, TranslationCache } from '../types/song'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  centeredBoxY,
  DEFAULT_FILL_COLOR,
  DEFAULT_MAIN_TEXT_POSITION,
  DEFAULT_MAIN_TEXT_STYLE,
  DEFAULT_SLIDE_BACKGROUND,
  DEFAULT_THIRD_LANGUAGE_COLOR,
  DEFAULT_TRANSLATION_TEXT_POSITION,
  DEFAULT_TRANSLATION_TEXT_STYLE,
  fitBoxHeight,
  translationCacheKey,
} from '../types/song'
import { splitLyricsIntoSections } from '../lib/lyrics/splitLyrics'
import type { Slice, SongSlice, TextEffect, TextRole } from './types'
import type { VerticalAlignment } from '../types/song'

/** Margin (px) kept between the text box and the canvas edge for top/bottom placement. */
const PLACEMENT_MARGIN = 40

/** Gap (px) kept between the main and translation boxes when clamping translation under main text (matches the DEFAULT_MAIN_TEXT_POSITION/DEFAULT_TRANSLATION_TEXT_POSITION gap in types/song.ts). */
const CLAMP_GAP = 20

/** Computes the box's new top-left `y` for a given vertical zone, given that box's own height. */
function verticalZoneY(zone: VerticalAlignment, height: number): number {
  switch (zone) {
    case 'top':
      return PLACEMENT_MARGIN
    case 'center':
      return (CANVAS_HEIGHT - height) / 2
    case 'bottom':
      return CANVAS_HEIGHT - height - PLACEMENT_MARGIN
  }
}

function createTextElement(role: TextRole, plainText: string): TextElementState {
  const isMain = role === 'main'
  return {
    id: uuidv4(),
    role,
    plainText,
    position: isMain ? { ...DEFAULT_MAIN_TEXT_POSITION } : { ...DEFAULT_TRANSLATION_TEXT_POSITION },
    style: { ...(isMain ? DEFAULT_MAIN_TEXT_STYLE : DEFAULT_TRANSLATION_TEXT_STYLE) },
    fillColor: { ...DEFAULT_FILL_COLOR },
    verticalAlignment: 'bottom',
    opacity: 1,
    rotation: 0,
  }
}

// Rough canvas-px width of one character ≈ fontSizePt * this factor. Used to
// estimate how many display lines the text wraps to inside a box of a given
// width, so a narrower box (e.g. the Side-by-Side columns) gets a taller box.
// Deliberately a slight over-estimate of character width (fewer chars per line
// → taller box) so text is never clipped.
const CHAR_WIDTH_FACTOR = 0.6

/** Estimates how many display lines `text` wraps to inside a box `width` px wide. */
function estimateWrappedLines(text: string, width: number, fontSizePt: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSizePt * CHAR_WIDTH_FACTOR)))
  let lines = 0
  for (const raw of text.split('\n')) {
    lines += Math.max(1, Math.ceil(raw.trim().length / charsPerLine))
  }
  return Math.max(1, lines)
}

/** `el`'s point size shrunk by `scale` (never below 1pt). */
function scaledFontSize(el: TextElementState, scale: number): number {
  return Math.max(1, Math.round(el.style.fontSizePt * scale))
}

/** Box height (canvas px) needed to hold `el`'s text wrapped inside `width` px,
 * at `scale` x its chosen point size. */
function boxHeightForWidth(el: TextElementState, width: number, scale = 1): number {
  const size = scaledFontSize(el, scale)
  return fitBoxHeight(estimateWrappedLines(el.plainText, width, size), size, el.style.lineSpacingPct)
}

// Vertical breathing room kept clear at the top and bottom of the canvas, and
// the smallest fraction of the chosen point size auto-fit will shrink text to.
const CANVAS_MARGIN = 30
const MIN_FIT_SCALE = 0.4

/**
 * Largest scale in (MIN_FIT_SCALE..1] at which `measure` fits the canvas height.
 * Found by stepping down rather than solving directly: shrinking the font also
 * changes how many display lines the text wraps to, so height isn't a linear
 * function of scale.
 */
function fitScale(measure: (scale: number) => number): number {
  const available = CANVAS_HEIGHT - CANVAS_MARGIN * 2
  let scale = 1
  while (scale > MIN_FIT_SCALE && measure(scale) > available) {
    scale = Math.round((scale - 0.05) * 100) / 100
  }
  return scale
}

// Full-width text-box geometry (canvas px) used by every stacked layout.
const FULL_X = DEFAULT_MAIN_TEXT_POSITION.x
const FULL_WIDTH = DEFAULT_MAIN_TEXT_POSITION.width
// Side-by-side column geometry.
const SIDE_MARGIN = 80
const SIDE_GAP = 40

/** Collapses the presets into the layout families the box placement cares about. */
function layoutFamily(
  layout: SlideLayoutPreset,
): 'stacked' | 'interleaved' | 'side-by-side' | 'main-only' | 'translation-only' {
  switch (layout) {
    case 'side-by-side':
      return 'side-by-side'
    case 'original-only':
      return 'main-only'
    case 'translation-only':
      return 'translation-only'
    case 'alternating':
    case 'two-plus-two':
      return 'interleaved'
    default:
      return 'stacked'
  }
}

function placeBox(
  el: TextElementState,
  x: number,
  width: number,
  y: number,
  height: number,
  scale = 1,
): TextElementState {
  const size = scaledFontSize(el, scale)
  const placed: TextElementState = {
    ...el,
    position: { ...el.position, x, width, y, height },
    verticalAlignment: 'center',
    fittedFontSizePt: size,
  }
  // Full size is the common case; leave the field off entirely so exports of
  // unshrunk slides stay byte-identical to before auto-fit existed.
  if (size === el.style.fontSizePt) delete placed.fittedFontSizePt
  return placed
}

/**
 * Auto-lays-out a slide's text boxes for the given layout preset. Boxes are
 * sized to their own line count and vertically centered; the translation gets
 * exactly the same dynamic treatment as the main text. Placement depends on the
 * layout family:
 *  - stacked: main above translation (CLAMP_GAP between), the pair centered.
 *  - side-by-side: main on the left half, translation on the right half.
 *  - main-only / translation-only: the visible box is centered on its own.
 */
function autoLayoutSlide(slide: Slide, layout: SlideLayoutPreset): Slide {
  const family = layoutFamily(layout)
  const translation = slide.translationText

  if (family === 'side-by-side' && translation) {
    const half = CANVAS_WIDTH / 2
    const colWidth = half - SIDE_MARGIN - SIDE_GAP / 2
    // The columns are independent, so each only has to fit on its own.
    const scale = fitScale((s) =>
      Math.max(boxHeightForWidth(slide.mainText, colWidth, s), boxHeightForWidth(translation, colWidth, s)),
    )
    const mainHeight = boxHeightForWidth(slide.mainText, colWidth, scale)
    const translationHeight = boxHeightForWidth(translation, colWidth, scale)
    return {
      ...slide,
      mainText: placeBox(slide.mainText, SIDE_MARGIN, colWidth, centeredBoxY(mainHeight), mainHeight, scale),
      translationText: placeBox(translation, half + SIDE_GAP / 2, colWidth, centeredBoxY(translationHeight), translationHeight, scale),
    }
  }

  // Interleaved (Alternating / Two + Two): the original and translated lines
  // are woven into one block (rendered/exported from the main box), so size the
  // main box to hold every line from both languages, centered.
  if (family === 'interleaved' && translation) {
    const combinedHeight = (s: number) => {
      const mainSize = scaledFontSize(slide.mainText, s)
      const lines =
        estimateWrappedLines(slide.mainText.plainText, FULL_WIDTH, mainSize) +
        estimateWrappedLines(translation.plainText, FULL_WIDTH, scaledFontSize(translation, s))
      return fitBoxHeight(lines, mainSize, slide.mainText.style.lineSpacingPct)
    }
    const scale = fitScale(combinedHeight)
    const height = combinedHeight(scale)
    const y = centeredBoxY(height)
    return {
      ...slide,
      mainText: placeBox(slide.mainText, FULL_X, FULL_WIDTH, y, height, scale),
      // Keep the translation box co-located with the main box; it isn't drawn
      // separately in this family (its lines are woven into the main block).
      translationText: placeBox(translation, FULL_X, FULL_WIDTH, y, height, scale),
    }
  }

  // Stacked with a translation: center the main+gap+translation block together,
  // shrinking both to fit if the pair would otherwise run off the canvas.
  if (family === 'stacked' && translation) {
    const scale = fitScale(
      (s) => boxHeightForWidth(slide.mainText, FULL_WIDTH, s) + CLAMP_GAP + boxHeightForWidth(translation, FULL_WIDTH, s),
    )
    const mainHeight = boxHeightForWidth(slide.mainText, FULL_WIDTH, scale)
    const translationHeight = boxHeightForWidth(translation, FULL_WIDTH, scale)
    const blockTop = centeredBoxY(mainHeight + CLAMP_GAP + translationHeight)
    return {
      ...slide,
      mainText: placeBox(slide.mainText, FULL_X, FULL_WIDTH, blockTop, mainHeight, scale),
      translationText: placeBox(translation, FULL_X, FULL_WIDTH, blockTop + mainHeight + CLAMP_GAP, translationHeight, scale),
    }
  }

  // main-only, translation-only, or no translation: center each (visible) box on
  // its own. Hidden boxes are still centered so switching layouts stays sane.
  const mainScale = fitScale((s) => boxHeightForWidth(slide.mainText, FULL_WIDTH, s))
  const mainHeight = boxHeightForWidth(slide.mainText, FULL_WIDTH, mainScale)
  const mainText = placeBox(slide.mainText, FULL_X, FULL_WIDTH, centeredBoxY(mainHeight), mainHeight, mainScale)
  if (!translation) return { ...slide, mainText }
  const translationScale = fitScale((s) => boxHeightForWidth(translation, FULL_WIDTH, s))
  const translationHeight = boxHeightForWidth(translation, FULL_WIDTH, translationScale)
  return {
    ...slide,
    mainText,
    translationText: placeBox(
      translation,
      FULL_X,
      FULL_WIDTH,
      centeredBoxY(translationHeight),
      translationHeight,
      translationScale,
    ),
  }
}

function createSlideFromLines(lines: string[], order: number, label = '', autoFit = true, layout: SlideLayoutPreset = 'original-translation'): Slide {
  const slide: Slide = {
    id: uuidv4(),
    label,
    notes: '',
    enabled: true,
    backgroundColor: { ...DEFAULT_SLIDE_BACKGROUND },
    mainText: createTextElement('main', lines.join('\n')),
    translationText: null,
    order,
  }
  return autoFit ? autoLayoutSlide(slide, layout) : slide
}

function nowIso(): string {
  return new Date().toISOString()
}

function emptySong(title: string): Song {
  return {
    id: uuidv4(),
    title,
    artist: '',
    rawLyrics: '',
    splitSettings: { linesPerSlide: 2, skipBlankLines: true },
    slides: [],
    groups: [],
    targetLanguage: null,
    sourceLanguage: 'en',
    translationCache: {},
    layout: 'original-translation',
    thirdLanguageColor: { ...DEFAULT_THIRD_LANGUAGE_COLOR },
    published: false,
    autoFitBox: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

/** Finds the slide (by id) and its target text element (main or translation), or undefined if either is missing. */
function locateTextElement(
  song: Song,
  slideId: string,
  role: TextRole,
): { slide: Slide; element: TextElementState | null } | undefined {
  const slide = song.slides.find((s) => s.id === slideId)
  if (!slide) return undefined
  return { slide, element: role === 'main' ? slide.mainText : slide.translationText }
}

/** Applies an updater to a slide's given text element, creating a default translation element on demand. */
function updateElement(
  song: Song,
  slideId: string,
  role: TextRole,
  updater: (el: TextElementState) => TextElementState,
): Song {
  const located = locateTextElement(song, slideId, role)
  if (!located) return song

  const current = located.element ?? createTextElement(role, '')
  const updated = updater(current)

  return {
    ...song,
    updatedAt: nowIso(),
    slides: song.slides.map((slide) =>
      slide.id === slideId
        ? { ...slide, [role === 'main' ? 'mainText' : 'translationText']: updated }
        : slide,
    ),
  }
}

/** Applies an updater to every slide's given text element (role), skipping slides with no translation element. */
function updateAllElements(
  song: Song,
  role: TextRole,
  updater: (el: TextElementState) => TextElementState,
): Song {
  return {
    ...song,
    updatedAt: nowIso(),
    slides: song.slides.map((slide) => {
      if (role === 'main') {
        return { ...slide, mainText: updater(slide.mainText) }
      }
      if (slide.translationText === null) return slide
      return { ...slide, translationText: updater(slide.translationText) }
    }),
  }
}

/**
 * Applies clamped bulk placement to every slide: main text always moves to `zone`
 * solo (existing formula) when there's no translation text to clamp to. When a
 * slide DOES have translation text, the main+translation boxes are treated as one
 * stacked unit (main on top, `CLAMP_GAP` px gap, translation below) and the whole
 * unit is placed at `zone` together, so the translation always sits directly under
 * the main text instead of being positioned independently.
 */
function updateAllSlidesPlacementClampedSong(song: Song, zone: VerticalAlignment): Song {
  return {
    ...song,
    updatedAt: nowIso(),
    slides: song.slides.map((slide) => {
      if (slide.translationText === null) {
        return {
          ...slide,
          mainText: {
            ...slide.mainText,
            position: { ...slide.mainText.position, y: verticalZoneY(zone, slide.mainText.position.height) },
            verticalAlignment: zone,
          },
        }
      }

      const mainHeight = slide.mainText.position.height
      const translationHeight = slide.translationText.position.height
      const combinedHeight = mainHeight + CLAMP_GAP + translationHeight
      const blockTop = verticalZoneY(zone, combinedHeight)
      const mainY = blockTop
      const translationY = blockTop + mainHeight + CLAMP_GAP

      return {
        ...slide,
        mainText: {
          ...slide.mainText,
          position: { ...slide.mainText.position, y: mainY },
          verticalAlignment: zone,
        },
        translationText: {
          ...slide.translationText,
          position: { ...slide.translationText.position, y: translationY },
          verticalAlignment: zone,
        },
      }
    }),
  }
}

/**
 * Returns the song's saved per-line translation cache, topped up with entries
 * recovered from the slides themselves.
 *
 * The recovery pass exists for songs saved before the cache was persisted: a
 * slide whose main and translation text have the same number of lines is a
 * reliable line-by-line pairing, so those lines can be re-cached without any
 * network calls. Slides whose line counts differ (a translation that wrapped
 * differently, or was hand-edited into a different shape) are skipped rather
 * than guessed at. Saved entries always win over recovered ones.
 */
function recoverCacheFromSlides(song: Song): TranslationCache {
  const saved = song.translationCache ?? {}
  const targetLanguage = song.targetLanguage
  if (!targetLanguage) return saved

  const recovered: TranslationCache = {}
  for (const slide of song.slides) {
    if (slide.translationText === null) continue
    const mainLines = slide.mainText.plainText.split('\n')
    const translationLines = slide.translationText.plainText.split('\n')
    if (mainLines.length !== translationLines.length) continue
    for (const [i, sourceText] of mainLines.entries()) {
      if (sourceText.trim() === '') continue
      recovered[translationCacheKey(song.sourceLanguage, targetLanguage, sourceText)] = {
        sourceText,
        sourceLang: song.sourceLanguage,
        targetLang: targetLanguage,
        translatedText: translationLines[i],
        fetchedAt: song.updatedAt,
        overridden: false,
      }
    }
  }
  return { ...recovered, ...saved }
}

export const createSongSlice: Slice<SongSlice> = (set, get) => ({
  song: null,

  newSong: (title) => set({ song: emptySong(title) }),

  setSong: (song) => {
    // Loading a song rehydrates the in-memory translation state from it: the
    // cache (so a re-split doesn't re-translate) and the chosen target language
    // (so the dropdown isn't blank). Songs saved before the cache was persisted
    // get one recovered from the translations already on their slides.
    const cache = recoverCacheFromSlides(song)
    set({ song, cache, targetLanguage: song.targetLanguage ?? null })
  },

  setSongTitle: (title) => {
    const song = get().song
    if (!song) return
    set({ song: { ...song, title, updatedAt: nowIso() } })
  },

  setSongArtist: (artist) => {
    const song = get().song
    if (!song) return
    set({ song: { ...song, artist, updatedAt: nowIso() } })
  },

  setSongSourceLanguage: (sourceLanguage) => {
    const song = get().song
    if (!song) return
    set({ song: { ...song, sourceLanguage, updatedAt: nowIso() } })
  },

  setSongLayout: (layout) => {
    const song = get().song
    if (!song) return
    // Changing the composition re-places every slide's boxes (stacked vs
    // side-by-side vs single) so the change is immediate and export-correct.
    const slides = song.autoFitBox ? song.slides.map((s) => autoLayoutSlide(s, layout)) : song.slides
    set({ song: { ...song, layout, slides, updatedAt: nowIso() } })
  },

  setSongPublished: (published) => {
    const song = get().song
    if (!song) return
    set({ song: { ...song, published, updatedAt: nowIso() } })
  },

  setThirdLanguageColor: (thirdLanguageColor) => {
    const song = get().song
    if (!song) return
    set({ song: { ...song, thirdLanguageColor, updatedAt: nowIso() } })
  },

  refitAllBoxes: () => {
    const song = get().song
    if (!song || !song.autoFitBox) return
    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: song.slides.map((s) => autoLayoutSlide(s, song.layout)),
      },
    })
  },

  setAutoFitBox: (enabled) => {
    const song = get().song
    if (!song) return
    const next: Song = { ...song, autoFitBox: enabled, updatedAt: nowIso() }
    if (enabled) next.slides = next.slides.map((s) => autoLayoutSlide(s, next.layout))
    set({ song: next })
  },

  setAllSlidesTextEffect: (effect: TextEffect, enabled) => {
    const song = get().song
    if (!song) return
    const key = effect === 'shadow' ? 'textShadow' : 'textOutline'
    const apply = (el: TextElementState): TextElementState => ({
      ...el,
      style: { ...el.style, [key]: enabled },
    })
    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: song.slides.map((slide) => ({
          ...slide,
          mainText: apply(slide.mainText),
          translationText: slide.translationText === null ? null : apply(slide.translationText),
        })),
      },
    })
  },

  updateAllSlidesStyle: (role, styleUpdate) => {
    const song = get().song
    if (!song) return
    set({ song: updateAllElements(song, role, (el) => ({ ...el, style: { ...el.style, ...styleUpdate } })) })
  },

  importLyrics: (rawText, linesPerSlide) => {
    // Section-aware split: each detected [Verse 1]/Chorus:/… header names the
    // slides beneath it (stored on Slide.label, used by the sidebar grouping
    // and the exported pro6 slide label). Lyrics with no headers collapse to a
    // single unnamed section, i.e. the historical flat behavior.
    const existingForFlag = get().song
    const autoFit = existingForFlag?.autoFitBox ?? true
    const layout = existingForFlag?.layout ?? 'original-translation'
    const sections = splitLyricsIntoSections(rawText, linesPerSlide)
    const slides: Slide[] = []
    for (const section of sections) {
      for (const lines of section.slides) {
        slides.push(createSlideFromLines(lines, slides.length, section.name, autoFit, layout))
      }
    }

    // A single authoritative ordering group (drag-reorder / merge / split all
    // operate on this one list); section names live on the slides themselves.
    const group: SlideGroup = {
      id: uuidv4(),
      name: 'Slides',
      color: { r: 1, g: 1, b: 1, a: 0 },
      slideIds: slides.map((s) => s.id),
    }

    const existing = get().song
    const song: Song = {
      id: existing?.id ?? uuidv4(),
      title: existing?.title ?? 'Untitled Song',
      artist: existing?.artist ?? '',
      rawLyrics: rawText,
      splitSettings: { linesPerSlide, skipBlankLines: true },
      slides,
      groups: [group],
      targetLanguage: existing?.targetLanguage ?? null,
      sourceLanguage: existing?.sourceLanguage ?? 'en',
      // Kept across a re-split: that's the whole point of caching per line.
      translationCache: existing?.translationCache ?? {},
      layout: existing?.layout ?? 'original-translation',
      thirdLanguageColor: existing?.thirdLanguageColor ?? { ...DEFAULT_THIRD_LANGUAGE_COLOR },
      published: existing?.published ?? false,
      autoFitBox: existing?.autoFitBox ?? true,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    }
    set({ song })
  },

  updateSlideText: (slideId, role, plainText) => {
    const song = get().song
    if (!song) return
    let updated = updateElement(song, slideId, role, (el) => ({ ...el, plainText }))
    // Re-flow the affected slide so the box hugs its (possibly new) line count
    // and a freshly-added translation lands directly under the main text.
    if (updated.autoFitBox) {
      updated = {
        ...updated,
        slides: updated.slides.map((s) => (s.id === slideId ? autoLayoutSlide(s, updated.layout) : s)),
      }
    }
    set({ song: updated })
  },

  updateSlideStyle: (slideId, role, styleUpdate) => {
    const song = get().song
    if (!song) return
    set({
      song: updateElement(song, slideId, role, (el) => ({ ...el, style: { ...el.style, ...styleUpdate } })),
    })
  },

  updateSlidePosition: (slideId, role, position) => {
    const song = get().song
    if (!song) return
    set({ song: updateElement(song, slideId, role, (el) => ({ ...el, position })) })
  },

  updateSlideVerticalAlignment: (slideId, role, verticalAlignment) => {
    const song = get().song
    if (!song) return
    set({ song: updateElement(song, slideId, role, (el) => ({ ...el, verticalAlignment })) })
  },

  updateSlideBackgroundColor: (slideId, backgroundColor) => {
    const song = get().song
    if (!song) return
    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: song.slides.map((slide) => (slide.id === slideId ? { ...slide, backgroundColor } : slide)),
      },
    })
  },

  updateAllSlidesBackgroundColor: (backgroundColor) => {
    const song = get().song
    if (!song) return
    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: song.slides.map((slide) => ({ ...slide, backgroundColor })),
      },
    })
  },

  setAllSlidesHorizontalPadding: (padding) => {
    const song = get().song
    if (!song) return
    const clamped = Math.max(0, Math.min(padding, Math.floor(CANVAS_WIDTH / 2) - 20))
    const width = CANVAS_WIDTH - clamped * 2
    const inset = (el: TextElementState): TextElementState => ({
      ...el,
      position: { ...el.position, x: clamped, width },
    })
    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: song.slides.map((slide) => ({
          ...slide,
          mainText: inset(slide.mainText),
          translationText: slide.translationText === null ? null : inset(slide.translationText),
        })),
      },
    })
  },

  setAllSlidesBoxHeight: (role, height) => {
    const song = get().song
    if (!song) return
    const clamped = Math.max(40, Math.min(height, CANVAS_HEIGHT))
    set({ song: updateAllElements(song, role, (el) => ({ ...el, position: { ...el.position, height: clamped } })) })
  },

  updateAllSlidesPlacement: (role, zone) => {
    const song = get().song
    if (!song) return
    set({
      song: updateAllElements(song, role, (el) => ({
        ...el,
        position: { ...el.position, y: verticalZoneY(zone, el.position.height) },
        verticalAlignment: zone,
      })),
    })
  },

  updateAllSlidesPlacementClamped: (zone) => {
    const song = get().song
    if (!song) return
    set({ song: updateAllSlidesPlacementClampedSong(song, zone) })
  },

  reorderSlides: (orderedSlideIds) => {
    const song = get().song
    if (!song) return
    const validIds = new Set(song.slides.map((s) => s.id))
    const reordered = orderedSlideIds.filter((id) => validIds.has(id))
    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: song.slides.map((slide) => ({ ...slide, order: reordered.indexOf(slide.id) })),
        groups: song.groups.map((group) => ({ ...group, slideIds: reordered })),
      },
    })
  },

  mergeSlides: (slideIdsInOrder) => {
    const song = get().song
    if (!song || slideIdsInOrder.length < 2) return

    const slidesById = new Map(song.slides.map((s) => [s.id, s]))
    const toMerge = slideIdsInOrder.map((id) => slidesById.get(id)).filter((s): s is Slide => s !== undefined)
    if (toMerge.length < 2) return

    const [first, ...rest] = toMerge
    const mergedText = toMerge.map((s) => s.mainText.plainText).join('\n')
    const mergedTranslation =
      first.translationText === null
        ? null
        : { ...first.translationText, plainText: toMerge.map((s) => s.translationText?.plainText ?? '').filter(Boolean).join('\n') }

    const mergedSlide: Slide = {
      ...first,
      mainText: { ...first.mainText, plainText: mergedText },
      translationText: mergedTranslation,
    }

    const removedIds = new Set(rest.map((s) => s.id))
    const remainingSlides = song.slides
      .filter((s) => !removedIds.has(s.id))
      .map((s) => (s.id === first.id ? mergedSlide : s))

    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: remainingSlides.map((s, i) => ({ ...s, order: i })),
        groups: song.groups.map((group) => ({
          ...group,
          slideIds: group.slideIds.filter((id) => !removedIds.has(id)),
        })),
      },
    })
  },

  splitSlideAtLine: (slideId, lineIndex) => {
    const song = get().song
    if (!song) return
    const slideIndex = song.slides.findIndex((s) => s.id === slideId)
    if (slideIndex === -1) return
    const slide = song.slides[slideIndex]
    const lines = slide.mainText.plainText.split('\n')
    if (lineIndex <= 0 || lineIndex >= lines.length) return

    const firstLines = lines.slice(0, lineIndex)
    const secondLines = lines.slice(lineIndex)

    const updatedFirst: Slide = { ...slide, mainText: { ...slide.mainText, plainText: firstLines.join('\n') } }
    const newSlide: Slide = {
      ...slide,
      id: uuidv4(),
      mainText: { ...slide.mainText, id: uuidv4(), plainText: secondLines.join('\n') },
      translationText: null,
    }

    const newSlides = [...song.slides]
    newSlides.splice(slideIndex, 1, updatedFirst, newSlide)

    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: newSlides.map((s, i) => ({ ...s, order: i })),
        groups: song.groups.map((group) => {
          const idx = group.slideIds.indexOf(slideId)
          if (idx === -1) return group
          const slideIds = [...group.slideIds]
          slideIds.splice(idx, 1, updatedFirst.id, newSlide.id)
          return { ...group, slideIds }
        }),
      },
    })
  },

  removeSlide: (slideId) => {
    const song = get().song
    if (!song) return
    set({
      song: {
        ...song,
        updatedAt: nowIso(),
        slides: song.slides.filter((s) => s.id !== slideId).map((s, i) => ({ ...s, order: i })),
        groups: song.groups.map((group) => ({
          ...group,
          slideIds: group.slideIds.filter((id) => id !== slideId),
        })),
      },
    })
  },
})
