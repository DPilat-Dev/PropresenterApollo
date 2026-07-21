import type { StateCreator } from 'zustand'
import type { RGBAColor, SlideLayoutPreset, Song, TextStyle, Rect3D, VerticalAlignment } from '../types/song'
import type { TranslationProvider } from '../lib/translation/types'
import type { TranslationCache } from '../types/song'

export type TextRole = 'main' | 'translation'
export type TextEffect = 'shadow' | 'outline'
/** Which text a style edit targets: one role, or both roles at once. */
export type StyleTarget = TextRole | 'both'

export interface SongSlice {
  song: Song | null
  newSong: (title: string) => void
  importLyrics: (rawText: string, linesPerSlide: number) => void
  setSong: (song: Song) => void
  setSongTitle: (title: string) => void
  setSongArtist: (artist: string) => void
  setSongSourceLanguage: (lang: string) => void
  setSongLayout: (layout: SlideLayoutPreset) => void
  setSongPublished: (published: boolean) => void
  setThirdLanguageColor: (color: RGBAColor) => void
  setAllSlidesTextEffect: (effect: TextEffect, enabled: boolean) => void
  /** Toggles auto-fit box sizing; enabling it immediately re-fits every slide. */
  setAutoFitBox: (enabled: boolean) => void
  /** Re-sizes and re-centers every slide's main-text box to fit its current
   * content and font. No-op unless auto-fit is on. */
  refitAllBoxes: () => void
  updateSlideText: (slideId: string, role: TextRole, plainText: string) => void
  updateSlideStyle: (slideId: string, role: TextRole, style: Partial<TextStyle>) => void
  updateAllSlidesStyle: (role: TextRole, style: Partial<TextStyle>) => void
  updateSlidePosition: (slideId: string, role: TextRole, position: Rect3D) => void
  updateSlideVerticalAlignment: (slideId: string, role: TextRole, alignment: VerticalAlignment) => void
  updateSlideBackgroundColor: (slideId: string, color: RGBAColor) => void
  updateAllSlidesBackgroundColor: (color: RGBAColor) => void
  /** Sets a symmetric left/right inset (px) on every slide's text boxes, resizing
   * their width to match the canvas minus twice the padding. */
  setAllSlidesHorizontalPadding: (padding: number) => void
  /** Sets the box height (px) for every slide's text box of the given role. */
  setAllSlidesBoxHeight: (role: TextRole, height: number) => void
  updateAllSlidesPlacement: (role: TextRole, zone: VerticalAlignment) => void
  updateAllSlidesPlacementClamped: (zone: VerticalAlignment) => void
  reorderSlides: (orderedSlideIds: string[]) => void
  mergeSlides: (slideIdsInOrder: string[]) => void
  splitSlideAtLine: (slideId: string, lineIndex: number) => void
  removeSlide: (slideId: string) => void
}

export interface TranslationSlice {
  sourceLanguage: string
  targetLanguage: string | null
  cache: TranslationCache
  provider: TranslationProvider
  translationErrors: Record<string, string>
  translatingSlideIds: string[]
  setTargetLanguage: (lang: string | null) => void
  translateSlide: (slideId: string) => Promise<void>
  translateAllSlides: () => Promise<void>
  setTranslationOverride: (slideId: string, text: string) => void
}

export interface UiSlice {
  selectedSlideId: string | null
  selectSlide: (id: string | null) => void
}

export type AppState = SongSlice & TranslationSlice & UiSlice

export type Slice<T> = StateCreator<AppState, [], [], T>
