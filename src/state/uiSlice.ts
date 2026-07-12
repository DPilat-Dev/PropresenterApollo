import type { Slice, UiSlice } from './types'

export const createUiSlice: Slice<UiSlice> = (set) => ({
  selectedSlideId: null,

  selectSlide: (id) => set({ selectedSlideId: id }),
})
