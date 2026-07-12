import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from './store'

beforeEach(() => {
  useAppStore.setState({ selectedSlideId: null })
})

describe('uiSlice', () => {
  it('selectSlide sets the selected slide id', () => {
    useAppStore.getState().selectSlide('slide-1')
    expect(useAppStore.getState().selectedSlideId).toBe('slide-1')
  })

  it('selectSlide can clear the selection back to null', () => {
    useAppStore.getState().selectSlide('slide-1')
    useAppStore.getState().selectSlide(null)
    expect(useAppStore.getState().selectedSlideId).toBeNull()
  })
})
