import { create } from 'zustand'
import type { AppState } from './types'
import { createSongSlice } from './songSlice'
import { createTranslationSlice } from './translationSlice'
import { createUiSlice } from './uiSlice'

export const useAppStore = create<AppState>()((...a) => ({
  ...createSongSlice(...a),
  ...createTranslationSlice(...a),
  ...createUiSlice(...a),
}))
