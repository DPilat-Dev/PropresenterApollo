import { beforeEach, describe, expect, it } from 'vitest'
import {
  CANVAS_HEIGHT,
  DEFAULT_FILL_COLOR,
  DEFAULT_TRANSLATION_TEXT_POSITION,
  DEFAULT_TRANSLATION_TEXT_STYLE,
} from '../types/song'
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
      // Auto-fit keeps the default x/width but re-flows the box directly under
      // the main text (so it no longer equals DEFAULT_TRANSLATION_TEXT_POSITION).
      expect(slide.translationText!.position.x).toBe(DEFAULT_TRANSLATION_TEXT_POSITION.x)
      expect(slide.translationText!.position.width).toBe(DEFAULT_TRANSLATION_TEXT_POSITION.width)
      expect(slide.translationText!.position.y).toBeGreaterThan(
        slide.mainText.position.y + slide.mainText.position.height,
      )
      expect(slide.translationText!.style).toEqual(DEFAULT_TRANSLATION_TEXT_STYLE)
      expect(slide.translationText!.role).toBe('translation')
      expect(slide.translationText!.fillColor).toEqual(DEFAULT_FILL_COLOR)
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

  describe('updateAllSlidesPlacement', () => {
    it('moves every slide mainText box to the top and sets verticalAlignment, leaving x/z/width/height unchanged, and bumps updatedAt', async () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd\n\ne\nf', 2)
      const before = useAppStore.getState().song!
      expect(before.slides.length).toBeGreaterThanOrEqual(3)
      const previousUpdatedAt = before.updatedAt
      const originalPositions = before.slides.map((s) => ({ ...s.mainText.position }))

      await new Promise((r) => setTimeout(r, 5))

      useAppStore.getState().updateAllSlidesPlacement('main', 'top')
      const after = useAppStore.getState().song!

      after.slides.forEach((slide, i) => {
        expect(slide.mainText.verticalAlignment).toBe('top')
        expect(slide.mainText.position.y).toBe(40)
        expect(slide.mainText.position.x).toBe(originalPositions[i].x)
        expect(slide.mainText.position.z).toBe(originalPositions[i].z)
        expect(slide.mainText.position.width).toBe(originalPositions[i].width)
        expect(slide.mainText.position.height).toBe(originalPositions[i].height)
      })
      expect(after.updatedAt).not.toBe(previousUpdatedAt)
    })

    it('computes the center y from CANVAS_HEIGHT and each element height', () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
      const before = useAppStore.getState().song!
      const heights = before.slides.map((s) => s.mainText.position.height)

      useAppStore.getState().updateAllSlidesPlacement('main', 'center')
      const after = useAppStore.getState().song!

      after.slides.forEach((slide, i) => {
        expect(slide.mainText.verticalAlignment).toBe('center')
        expect(slide.mainText.position.y).toBe((CANVAS_HEIGHT - heights[i]) / 2)
      })
    })

    it('computes the bottom y from CANVAS_HEIGHT and each element height', () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
      const before = useAppStore.getState().song!
      const heights = before.slides.map((s) => s.mainText.position.height)

      useAppStore.getState().updateAllSlidesPlacement('main', 'bottom')
      const after = useAppStore.getState().song!

      after.slides.forEach((slide, i) => {
        expect(slide.mainText.verticalAlignment).toBe('bottom')
        expect(slide.mainText.position.y).toBe(CANVAS_HEIGHT - heights[i] - 40)
      })
    })

    it('only changes slides that already have translationText when role is translation, without creating new ones', () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd\n\ne\nf', 2)
      const song = useAppStore.getState().song!
      const [id0, , id2] = song.slides.map((s) => s.id)

      // Give only slides 0 and 2 a translation element.
      useAppStore.getState().updateSlideText(id0, 'translation', 'uno')
      useAppStore.getState().updateSlideText(id2, 'translation', 'tres')
      expect(useAppStore.getState().song!.slides[1].translationText).toBeNull()

      const heights = useAppStore.getState().song!.slides.map((s) => s.translationText?.position.height)

      useAppStore.getState().updateAllSlidesPlacement('translation', 'center')
      const after = useAppStore.getState().song!

      expect(after.slides[0].translationText!.verticalAlignment).toBe('center')
      expect(after.slides[0].translationText!.position.y).toBe((CANVAS_HEIGHT - heights[0]!) / 2)
      expect(after.slides[2].translationText!.verticalAlignment).toBe('center')
      expect(after.slides[2].translationText!.position.y).toBe((CANVAS_HEIGHT - heights[2]!) / 2)
      expect(after.slides[1].translationText).toBeNull()
    })

    it('does not affect mainText when role is translation, and vice versa', () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
      const song = useAppStore.getState().song!
      const id0 = song.slides[0].id
      useAppStore.getState().updateSlideText(id0, 'translation', 'uno')

      const mainBefore = useAppStore.getState().song!.slides[0].mainText.verticalAlignment
      const mainPositionBefore = { ...useAppStore.getState().song!.slides[0].mainText.position }
      useAppStore.getState().updateAllSlidesPlacement('translation', 'top')
      expect(useAppStore.getState().song!.slides[0].mainText.verticalAlignment).toBe(mainBefore)
      expect(useAppStore.getState().song!.slides[0].mainText.position).toEqual(mainPositionBefore)

      const translationBefore = useAppStore.getState().song!.slides[0].translationText!.verticalAlignment
      const translationPositionBefore = { ...useAppStore.getState().song!.slides[0].translationText!.position }
      useAppStore.getState().updateAllSlidesPlacement('main', 'bottom')
      expect(useAppStore.getState().song!.slides[0].translationText!.verticalAlignment).toBe(translationBefore)
      expect(useAppStore.getState().song!.slides[0].translationText!.position).toEqual(translationPositionBefore)
    })

    it('is a no-op and does not throw when song is null', () => {
      expect(useAppStore.getState().song).toBeNull()
      expect(() => {
        useAppStore.getState().updateAllSlidesPlacement('main', 'top')
      }).not.toThrow()
      expect(useAppStore.getState().song).toBeNull()
    })
  })

  describe('updateAllSlidesPlacementClamped', () => {
    const CLAMP_GAP = 20
    const PLACEMENT_MARGIN = 40

    it('stacks main+translation as one unit at the top, with the correct gap between them', () => {
      useAppStore.getState().importLyrics('a\nb', 2)
      const slideId = useAppStore.getState().song!.slides[0].id
      useAppStore.getState().updateSlideText(slideId, 'translation', 'hola')

      const before = useAppStore.getState().song!.slides[0]
      const mainHeight = before.mainText.position.height
      const expectedMainY = PLACEMENT_MARGIN
      const expectedTranslationY = expectedMainY + mainHeight + CLAMP_GAP

      useAppStore.getState().updateAllSlidesPlacementClamped('top')
      const slide = useAppStore.getState().song!.slides[0]

      expect(slide.mainText.verticalAlignment).toBe('top')
      expect(slide.translationText!.verticalAlignment).toBe('top')
      expect(slide.mainText.position.y).toBe(expectedMainY)
      expect(slide.translationText!.position.y).toBe(expectedTranslationY)
      expect(slide.translationText!.position.y - (slide.mainText.position.y + mainHeight)).toBe(CLAMP_GAP)
    })

    it('stacks main+translation as one unit at center, computed from CANVAS_HEIGHT and combined height', () => {
      useAppStore.getState().importLyrics('a\nb', 2)
      const slideId = useAppStore.getState().song!.slides[0].id
      useAppStore.getState().updateSlideText(slideId, 'translation', 'hola')

      const before = useAppStore.getState().song!.slides[0]
      const mainHeight = before.mainText.position.height
      const translationHeight = before.translationText!.position.height
      const combinedHeight = mainHeight + CLAMP_GAP + translationHeight
      const expectedBlockTop = (CANVAS_HEIGHT - combinedHeight) / 2
      const expectedMainY = expectedBlockTop
      const expectedTranslationY = expectedBlockTop + mainHeight + CLAMP_GAP

      useAppStore.getState().updateAllSlidesPlacementClamped('center')
      const slide = useAppStore.getState().song!.slides[0]

      expect(slide.mainText.verticalAlignment).toBe('center')
      expect(slide.translationText!.verticalAlignment).toBe('center')
      expect(slide.mainText.position.y).toBe(expectedMainY)
      expect(slide.translationText!.position.y).toBe(expectedTranslationY)
      expect(slide.translationText!.position.y - (slide.mainText.position.y + mainHeight)).toBe(CLAMP_GAP)
    })

    it('stacks main+translation as one unit at the bottom, leaving PLACEMENT_MARGIN below the translation box', () => {
      useAppStore.getState().importLyrics('a\nb', 2)
      const slideId = useAppStore.getState().song!.slides[0].id
      useAppStore.getState().updateSlideText(slideId, 'translation', 'hola')

      const before = useAppStore.getState().song!.slides[0]
      const mainHeight = before.mainText.position.height
      const translationHeight = before.translationText!.position.height
      const combinedHeight = mainHeight + CLAMP_GAP + translationHeight
      const expectedBlockTop = CANVAS_HEIGHT - combinedHeight - PLACEMENT_MARGIN
      const expectedMainY = expectedBlockTop
      const expectedTranslationY = expectedBlockTop + mainHeight + CLAMP_GAP

      useAppStore.getState().updateAllSlidesPlacementClamped('bottom')
      const slide = useAppStore.getState().song!.slides[0]

      expect(slide.mainText.position.y).toBe(expectedMainY)
      expect(slide.translationText!.position.y).toBe(expectedTranslationY)
      expect(slide.translationText!.position.y - (slide.mainText.position.y + mainHeight)).toBe(CLAMP_GAP)
      // The bottom edge of the stacked unit sits exactly PLACEMENT_MARGIN above the canvas edge.
      expect(slide.translationText!.position.y + translationHeight).toBe(CANVAS_HEIGHT - PLACEMENT_MARGIN)
    })

    it('leaves x/z/width/height unchanged on both boxes', () => {
      useAppStore.getState().importLyrics('a\nb', 2)
      const slideId = useAppStore.getState().song!.slides[0].id
      useAppStore.getState().updateSlideText(slideId, 'translation', 'hola')

      const before = useAppStore.getState().song!.slides[0]
      const mainBefore = { ...before.mainText.position }
      const translationBefore = { ...before.translationText!.position }

      useAppStore.getState().updateAllSlidesPlacementClamped('center')
      const after = useAppStore.getState().song!.slides[0]

      expect(after.mainText.position.x).toBe(mainBefore.x)
      expect(after.mainText.position.z).toBe(mainBefore.z)
      expect(after.mainText.position.width).toBe(mainBefore.width)
      expect(after.mainText.position.height).toBe(mainBefore.height)
      expect(after.translationText!.position.x).toBe(translationBefore.x)
      expect(after.translationText!.position.z).toBe(translationBefore.z)
      expect(after.translationText!.position.width).toBe(translationBefore.width)
      expect(after.translationText!.position.height).toBe(translationBefore.height)
    })

    it('behaves like the plain solo formula for a slide with no translation text', () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
      const before = useAppStore.getState().song!
      expect(before.slides[0].translationText).toBeNull()
      const mainHeight = before.slides[0].mainText.position.height

      useAppStore.getState().updateAllSlidesPlacementClamped('bottom')
      const slide = useAppStore.getState().song!.slides[0]

      expect(slide.translationText).toBeNull()
      expect(slide.mainText.verticalAlignment).toBe('bottom')
      expect(slide.mainText.position.y).toBe(CANVAS_HEIGHT - mainHeight - PLACEMENT_MARGIN)
    })

    it('is a no-op and does not throw when song is null', () => {
      expect(useAppStore.getState().song).toBeNull()
      expect(() => {
        useAppStore.getState().updateAllSlidesPlacementClamped('top')
      }).not.toThrow()
      expect(useAppStore.getState().song).toBeNull()
    })
  })

  describe('updateSlideBackgroundColor', () => {
    it('updates only the targeted slide backgroundColor and bumps updatedAt', async () => {
      useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
      const before = useAppStore.getState().song!
      const targetId = before.slides[0].id
      const previousUpdatedAt = before.updatedAt

      await new Promise((r) => setTimeout(r, 5))

      const newColor = { r: 0.5, g: 0.1, b: 0.2, a: 1 }
      useAppStore.getState().updateSlideBackgroundColor(targetId, newColor)
      const after = useAppStore.getState().song!

      expect(after.slides[0].backgroundColor).toEqual(newColor)
      expect(after.slides[1].backgroundColor).not.toEqual(newColor)
      expect(after.updatedAt).not.toBe(previousUpdatedAt)
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
        useAppStore.getState().updateAllSlidesPlacement('main', 'top')
        useAppStore.getState().updateAllSlidesPlacementClamped('top')
        useAppStore.getState().reorderSlides(['a', 'b'])
        useAppStore.getState().mergeSlides(['a', 'b'])
        useAppStore.getState().splitSlideAtLine('missing', 1)
        useAppStore.getState().removeSlide('missing')
      }).not.toThrow()

      expect(useAppStore.getState().song).toBeNull()
    })
  })

  describe('auto-fit shrink-to-fit', () => {
    const LINE = 'this is a fairly long lyric line that will wrap'

    it('keeps a main+translation block inside the canvas at every lines-per-slide', () => {
      const lyrics = Array.from({ length: 16 }, (_, i) => `${LINE} ${i + 1}`).join('\n')

      for (const linesPerSlide of [1, 2, 3, 4, 5, 6, 7, 8]) {
        useAppStore.getState().importLyrics(lyrics, linesPerSlide)
        for (const slide of useAppStore.getState().song!.slides) {
          useAppStore.getState().updateSlideText(slide.id, 'translation', slide.mainText.plainText)
        }

        for (const slide of useAppStore.getState().song!.slides) {
          const main = slide.mainText.position
          const translation = slide.translationText!.position
          expect(main.y, `main off top at ${linesPerSlide} lines/slide`).toBeGreaterThanOrEqual(0)
          expect(
            translation.y + translation.height,
            `translation off the bottom at ${linesPerSlide} lines/slide`,
          ).toBeLessThanOrEqual(CANVAS_HEIGHT)
        }
      }
    })

    it('leaves fittedFontSizePt unset when the content already fits, and shrinks it when it does not', () => {
      useAppStore.getState().importLyrics('short line', 1)
      const smallSlide = useAppStore.getState().song!.slides[0]
      expect(smallSlide.mainText.fittedFontSizePt).toBeUndefined()

      const many = Array.from({ length: 10 }, (_, i) => `${LINE} ${i + 1}`).join('\n')
      useAppStore.getState().importLyrics(many, 10)
      const bigSlide = useAppStore.getState().song!.slides[0]
      expect(bigSlide.mainText.fittedFontSizePt).toBeLessThan(bigSlide.mainText.style.fontSizePt)
    })
  })
})
