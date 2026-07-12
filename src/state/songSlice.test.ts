import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TRANSLATION_TEXT_POSITION, DEFAULT_TRANSLATION_TEXT_STYLE } from '../types/song'
import { splitLyrics } from '../lib/lyrics/splitLyrics'
import { useAppStore } from './store'

beforeEach(() => {
  useAppStore.setState({ song: null })
})

describe('songSlice via useAppStore', () => {
  describe('importLyrics', () => {
    it('produces a song with the correct number of slides matching splitLyrics output', () => {
      const raw = 'line1\nline2\n\nline3\nline4'
      const expectedChunks = splitLyrics(raw, 2)

      useAppStore.getState().importLyrics(raw, 2)
      const song = useAppStore.getState().song

      expect(song).not.toBeNull()
      expect(song!.slides).toHaveLength(expectedChunks.length)
      expect(expectedChunks).toEqual([
        ['line1', 'line2'],
        ['line3', 'line4'],
      ])
    })

    it('joins each slide chunk with newlines for mainText.plainText', () => {
      useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4', 2)
      const song = useAppStore.getState().song!

      expect(song.slides[0].mainText.plainText).toBe('line1\nline2')
      expect(song.slides[1].mainText.plainText).toBe('line3\nline4')
    })

    it('creates a single default group whose slideIds matches the slide ids in order', () => {
      useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4', 2)
      const song = useAppStore.getState().song!

      expect(song.groups).toHaveLength(1)
      expect(song.groups[0].slideIds).toEqual(song.slides.map((s) => s.id))
    })
  })

  describe('updateSlideText', () => {
    it('updates only the targeted slide main text and bumps song.updatedAt', async () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
      const before = useAppStore.getState().song!
      const targetId = before.slides[0].id
      const otherText = before.slides[1].mainText.plainText
      const previousUpdatedAt = before.updatedAt

      // Ensure the timestamp has a chance to differ.
      await new Promise((r) => setTimeout(r, 5))

      useAppStore.getState().updateSlideText(targetId, 'main', 'new main text')
      const after = useAppStore.getState().song!

      expect(after.slides[0].mainText.plainText).toBe('new main text')
      expect(after.slides[1].mainText.plainText).toBe(otherText)
      expect(after.updatedAt).not.toBe(previousUpdatedAt)
    })

    it('creates a new translation text element with defaults when translationText is null', () => {
      useAppStore.getState().importLyrics('a\nb', 2)
      const slideId = useAppStore.getState().song!.slides[0].id
      expect(useAppStore.getState().song!.slides[0].translationText).toBeNull()

      useAppStore.getState().updateSlideText(slideId, 'translation', 'hola')
      const slide = useAppStore.getState().song!.slides[0]

      expect(slide.translationText).not.toBeNull()
      expect(slide.translationText!.plainText).toBe('hola')
      expect(slide.translationText!.position).toEqual(DEFAULT_TRANSLATION_TEXT_POSITION)
      expect(slide.translationText!.style).toEqual(DEFAULT_TRANSLATION_TEXT_STYLE)
      expect(slide.translationText!.role).toBe('translation')
    })
  })

  describe('updateSlideStyle / updateSlidePosition', () => {
    it('updates only the targeted element (main vs translation) on only the targeted slide', () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
      const song = useAppStore.getState().song!
      const targetId = song.slides[0].id
      const otherId = song.slides[1].id

      useAppStore.getState().updateSlideText(targetId, 'translation', 'translated')

      const originalMainStyle = useAppStore.getState().song!.slides[0].mainText.style
      const originalOtherMainStyle = useAppStore.getState().song!.slides[1].mainText.style

      useAppStore.getState().updateSlideStyle(targetId, 'translation', { fontSizePt: 99 })

      const afterStyle = useAppStore.getState().song!
      expect(afterStyle.slides[0].translationText!.style.fontSizePt).toBe(99)
      // main text on the same slide is untouched
      expect(afterStyle.slides[0].mainText.style).toEqual(originalMainStyle)
      // other slide is untouched
      expect(afterStyle.slides[1].mainText.style).toEqual(originalOtherMainStyle)
      expect(afterStyle.slides[1].translationText).toBeNull()

      const newPosition = { x: 1, y: 2, z: 3, width: 4, height: 5 }
      useAppStore.getState().updateSlidePosition(targetId, 'main', newPosition)
      const afterPosition = useAppStore.getState().song!
      expect(afterPosition.slides[0].mainText.position).toEqual(newPosition)
      expect(afterPosition.slides[0].translationText!.position).not.toEqual(newPosition)
      expect(afterPosition.slides[1].mainText.position).not.toEqual(newPosition)
      expect(afterPosition.slides[1].id).toBe(otherId)
    })
  })

  describe('reorderSlides', () => {
    it('updates group.slideIds to match and updates each slide order field', () => {
      useAppStore.getState().importLyrics('a\nb\nc', 1)
      const song = useAppStore.getState().song!
      const [s0, s1, s2] = song.slides.map((s) => s.id)
      const newOrder = [s2, s0, s1]

      useAppStore.getState().reorderSlides(newOrder)
      const after = useAppStore.getState().song!

      expect(after.groups[0].slideIds).toEqual(newOrder)
      expect(after.slides.find((s) => s.id === s2)!.order).toBe(0)
      expect(after.slides.find((s) => s.id === s0)!.order).toBe(1)
      expect(after.slides.find((s) => s.id === s1)!.order).toBe(2)
    })
  })

  describe('mergeSlides', () => {
    it('combines 3 consecutive slides into the first and removes the rest', () => {
      useAppStore.getState().importLyrics('a\nb\nc\nd\ne\nf', 1)
      const song = useAppStore.getState().song!
      const beforeCount = song.slides.length
      const [s0, s1, s2] = song.slides.map((s) => s.id)

      useAppStore.getState().mergeSlides([s0, s1, s2])
      const after = useAppStore.getState().song!

      expect(after.slides).toHaveLength(beforeCount - 2)
      const merged = after.slides.find((s) => s.id === s0)!
      expect(merged.mainText.plainText).toBe('a\nb\nc')
      expect(after.slides.some((s) => s.id === s1)).toBe(false)
      expect(after.slides.some((s) => s.id === s2)).toBe(false)
      expect(after.groups[0].slideIds).not.toContain(s1)
      expect(after.groups[0].slideIds).not.toContain(s2)
    })
  })

  describe('splitSlideAtLine', () => {
    it('splits a 4-line slide at line index 2 into two slides in place', () => {
      useAppStore.getState().importLyrics('a\nb\nc\nd', 4)
      const song = useAppStore.getState().song!
      expect(song.slides).toHaveLength(1)
      const originalId = song.slides[0].id
      const originalIndex = song.groups[0].slideIds.indexOf(originalId)

      useAppStore.getState().splitSlideAtLine(originalId, 2)
      const after = useAppStore.getState().song!

      expect(after.slides).toHaveLength(2)
      expect(after.slides[0].mainText.plainText).toBe('a\nb')
      expect(after.slides[1].mainText.plainText).toBe('c\nd')

      // The first half keeps the original slide's id; only the second half gets a fresh id.
      expect(after.slides[0].id).toBe(originalId)
      expect(after.slides[1].id).not.toBe(originalId)

      const newIds = after.slides.map((s) => s.id)
      const groupIds = after.groups[0].slideIds
      expect(groupIds).toContain(originalId)
      expect(groupIds.slice(originalIndex, originalIndex + 2)).toEqual(newIds)
    })
  })

  describe('removeSlide', () => {
    it('removes the slide from both song.slides and every group.slideIds', () => {
      useAppStore.getState().importLyrics('a\nb\nc', 1)
      const song = useAppStore.getState().song!
      const targetId = song.slides[1].id

      useAppStore.getState().removeSlide(targetId)
      const after = useAppStore.getState().song!

      expect(after.slides.some((s) => s.id === targetId)).toBe(false)
      for (const group of after.groups) {
        expect(group.slideIds).not.toContain(targetId)
      }
    })
  })

  describe('guards when song is null', () => {
    it('does not throw when mutation actions are called with no song loaded', () => {
      expect(useAppStore.getState().song).toBeNull()

      expect(() => {
        useAppStore.getState().updateSlideText('missing', 'main', 'x')
        useAppStore.getState().updateSlideStyle('missing', 'main', { fontSizePt: 10 })
        useAppStore.getState().updateSlidePosition('missing', 'main', { x: 0, y: 0, z: 0, width: 1, height: 1 })
        useAppStore.getState().updateSlideVerticalAlignment('missing', 'main', 'top')
        useAppStore.getState().reorderSlides(['a', 'b'])
        useAppStore.getState().mergeSlides(['a', 'b'])
        useAppStore.getState().splitSlideAtLine('missing', 1)
        useAppStore.getState().removeSlide('missing')
      }).not.toThrow()

      expect(useAppStore.getState().song).toBeNull()
    })
  })
})
