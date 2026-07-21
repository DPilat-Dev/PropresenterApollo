import { v4 as uuidv4 } from 'uuid'
import type { Slide, SlideGroup, Song, TextElementState } from '../types/song'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_FILL_COLOR,
  DEFAULT_MAIN_TEXT_POSITION,
  DEFAULT_MAIN_TEXT_STYLE,
  DEFAULT_SLIDE_BACKGROUND,
  DEFAULT_THIRD_LANGUAGE_COLOR,
  DEFAULT_TRANSLATION_TEXT_POSITION,
  DEFAULT_TRANSLATION_TEXT_STYLE,
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

function createSlideFromLines(lines: string[], order: number, label = ''): Slide {
  return {
    id: uuidv4(),
    label,
    notes: '',
    enabled: true,
    backgroundColor: { ...DEFAULT_SLIDE_BACKGROUND },
    mainText: createTextElement('main', lines.join('\n')),
    translationText: null,
    order,
  }
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
    layout: 'original-translation',
    thirdLanguageColor: { ...DEFAULT_THIRD_LANGUAGE_COLOR },
    published: false,
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

export const createSongSlice: Slice<SongSlice> = (set, get) => ({
  song: null,

  newSong: (title) => set({ song: emptySong(title) }),

  setSong: (song) => set({ song }),

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
    set({ song: { ...song, layout, updatedAt: nowIso() } })
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
    const sections = splitLyricsIntoSections(rawText, linesPerSlide)
    const slides: Slide[] = []
    for (const section of sections) {
      for (const lines of section.slides) {
        slides.push(createSlideFromLines(lines, slides.length, section.name))
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
      layout: existing?.layout ?? 'original-translation',
      thirdLanguageColor: existing?.thirdLanguageColor ?? { ...DEFAULT_THIRD_LANGUAGE_COLOR },
      published: existing?.published ?? false,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    }
    set({ song })
  },

  updateSlideText: (slideId, role, plainText) => {
    const song = get().song
    if (!song) return
    set({ song: updateElement(song, slideId, role, (el) => ({ ...el, plainText })) })
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
