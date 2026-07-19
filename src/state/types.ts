import type { StateCreator } from 'zustand'
import type { Song, TextStyle, Rect3D, VerticalAlignment } from '../types/song'
import type { TranslationProvider } from '../lib/translation/types'
import type { TranslationCache } from '../types/song'

export type TextRole = 'main' | 'translation'

export interface SongSlice {
  song: Song | null
  newSong: (title: string) => void
  importLyrics: (rawText: string, linesPerSlide: number) => void
  setSong: (song: Song) => void
  updateSlideText: (slideId: string, role: TextRole, plainText: string) => void
  updateSlideStyle: (slideId: string, role: TextRole, style: Partial<TextStyle>) => void
  updateSlidePosition: (slideId: string, role: TextRole, position: Rect3D) => void
  updateSlideVerticalAlignment: (slideId: string, role: TextRole, alignment: VerticalAlignment) => void
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
