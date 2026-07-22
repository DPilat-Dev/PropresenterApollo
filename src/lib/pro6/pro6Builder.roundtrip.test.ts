import { describe, expect, it } from 'vitest'
import { exportSongToPro6Xml } from './pro6Builder'
import { parsePro6ForTests } from './proPresenterImportForTests'
import { DEFAULT_FILL_COLOR } from '../../types/song'
import type { Slide, SlideGroup, Song, TextElementState } from '../../types/song'

const EPSILON = 1e-6

function normalizeLineJoins(text: string): string {
  return text.replace(/\r\n/g, '\n')
}

function makeTextElement(overrides: Partial<TextElementState>): TextElementState {
  return {
    id: 'a1111111-1111-1111-1111-111111111111',
    role: 'main',
    plainText: 'default text',
    position: { x: 160, y: 700, z: 0, width: 1600, height: 300 },
    style: { fontFamily: 'Arial', fontSizePt: 60, lineSpacingPct: 100, color: { r: 1, g: 1, b: 1, a: 1 } },
    fillColor: { ...DEFAULT_FILL_COLOR },
    verticalAlignment: 'bottom',
    opacity: 1,
    rotation: 0,
    ...overrides,
  }
}

// Slide 1: literal RTF/XML metacharacters that must survive both the RTF
// escaping layer and the XML escaping layer without corruption.
const slide1: Slide = {
  id: 's1-special-chars',
  label: 'Verse 1',
  notes: 'Contains special chars',
  enabled: true,
  backgroundColor: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
  mainText: makeTextElement({
    id: 'e1-main',
    plainText: 'Path: C:\\Users\\test\nSet {a, b} & <tag> "quoted"',
    position: { x: 50, y: 60, z: 0, width: 800, height: 200 },
    style: { fontFamily: 'Arial', fontSizePt: 48, lineSpacingPct: 100, color: { r: 0.9, g: 0.1, b: 0.1, a: 1 } },
    // Deliberately distinct from style.color above, to prove fillColor (not
    // style.color) drives the exported fillColor attribute.
    fillColor: { r: 0.3, g: 0.6, b: 0.2, a: 0.4 },
    verticalAlignment: 'top',
  }),
  translationText: null,
  order: 0,
}

// Slide 2: unicode-heavy - accented Latin, a CJK line, and an emoji.
const slide2: Slide = {
  id: 's2-unicode',
  label: 'Verse 2',
  notes: '',
  enabled: true,
  backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
  mainText: makeTextElement({
    id: 'e2-main',
    plainText: 'café, naïve, résumé\n主よ、みもとに近づかん\nSinging with joy 🎵🙏',
    position: { x: 100, y: 150, z: 1, width: 1700, height: 400 },
    style: { fontFamily: 'Noto Sans', fontSizePt: 54, lineSpacingPct: 120, color: { r: 1, g: 1, b: 0, a: 0.8 } },
    verticalAlignment: 'center',
  }),
  translationText: makeTextElement({
    id: 'e2-trans',
    role: 'translation',
    plainText: 'Gracia asombrosa, qué dulce es',
    position: { x: 100, y: 600, z: 0, width: 1700, height: 150 },
    style: { fontFamily: 'Arial', fontSizePt: 30, lineSpacingPct: 100, color: { r: 0.7, g: 0.7, b: 0.7, a: 1 } },
    verticalAlignment: 'bottom',
  }),
  order: 1,
}

// Slide 3: plain ASCII, with a translation, to cover the "both present, all
// ordinary text" baseline case.
const slide3: Slide = {
  id: 's3-plain',
  label: 'Chorus',
  notes: 'chorus notes',
  enabled: false,
  backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
  mainText: makeTextElement({
    id: 'e3-main',
    plainText: 'Amazing grace, how sweet the sound\nThat saved a wretch like me',
    position: { x: 200, y: 800, z: 0, width: 1500, height: 250 },
    style: { fontFamily: 'Georgia', fontSizePt: 44, lineSpacingPct: 100, color: { r: 0.2, g: 0.4, b: 0.9, a: 1 } },
    verticalAlignment: 'bottom',
  }),
  translationText: makeTextElement({
    id: 'e3-trans',
    role: 'translation',
    plainText: 'Sublime gracia',
    position: { x: 200, y: 1000, z: 0, width: 1500, height: 60 },
    style: { fontFamily: 'Georgia', fontSizePt: 24, lineSpacingPct: 100, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } },
    verticalAlignment: 'top',
  }),
  order: 2,
}

const group: SlideGroup = {
  id: 'g1-verse-group',
  name: 'Main',
  color: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
  slideIds: [slide1.id, slide2.id, slide3.id],
}

const song: Song = {
  id: 'song-roundtrip',
  title: 'Amazing Grace',
  rawLyrics: 'raw lyrics here',
  splitSettings: { linesPerSlide: 2, skipBlankLines: true },
  slides: [slide1, slide2, slide3],
  groups: [group],
  targetLanguage: 'es',
  artist: '',
  sourceLanguage: 'en',
  translationCache: {},
  layout: 'original-translation',
  thirdLanguageColor: { r: 0.556863, g: 0.803922, b: 0.901961, a: 1 },
  published: false,
  autoFitBox: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('pro6 export/import round-trip', () => {
  const xml = exportSongToPro6Xml(song)
  const parsed = parsePro6ForTests(xml)

  it('preserves slide count', () => {
    expect(parsed.slides.length).toBe(3)
  })

  it('round-trips slide 1 plain text exactly, including RTF/XML metacharacters', () => {
    const decoded = normalizeLineJoins(parsed.slides[0].plainText)
    const original = normalizeLineJoins(slide1.mainText.plainText)
    expect(decoded).toBe(original)
  })

  it('round-trips slide 1 translation as absent', () => {
    expect(parsed.slides[0].translationPlainText).toBeNull()
  })

  it('round-trips slide 2 unicode plain text exactly (accents, CJK, emoji)', () => {
    const decoded = normalizeLineJoins(parsed.slides[1].plainText)
    const original = normalizeLineJoins(slide2.mainText.plainText)
    expect(decoded).toBe(original)
  })

  it('round-trips slide 2 translation text', () => {
    expect(parsed.slides[1].translationPlainText).toBe(slide2.translationText!.plainText)
  })

  it('round-trips slide 3 plain text and translation', () => {
    expect(normalizeLineJoins(parsed.slides[2].plainText)).toBe(normalizeLineJoins(slide3.mainText.plainText))
    expect(parsed.slides[2].translationPlainText).toBe(slide3.translationText!.plainText)
  })

  it('round-trips each slide position within epsilon', () => {
    const originals = [slide1, slide2, slide3]
    parsed.slides.forEach((parsedSlide, i) => {
      const original = originals[i].mainText.position
      expect(parsedSlide.mainPosition.x).toBeCloseTo(original.x, 6)
      expect(parsedSlide.mainPosition.y).toBeCloseTo(original.y, 6)
      expect(parsedSlide.mainPosition.z).toBeCloseTo(original.z, 6)
      expect(parsedSlide.mainPosition.width).toBeCloseTo(original.width, 6)
      expect(parsedSlide.mainPosition.height).toBeCloseTo(original.height, 6)
    })
  })

  it('round-trips each slide main text fill color within epsilon', () => {
    const originals = [slide1, slide2, slide3]
    parsed.slides.forEach((parsedSlide, i) => {
      const original = originals[i].mainText.fillColor
      expect(Math.abs(parsedSlide.mainColor.r - original.r)).toBeLessThan(EPSILON)
      expect(Math.abs(parsedSlide.mainColor.g - original.g)).toBeLessThan(EPSILON)
      expect(Math.abs(parsedSlide.mainColor.b - original.b)).toBeLessThan(EPSILON)
      expect(Math.abs(parsedSlide.mainColor.a - original.a)).toBeLessThan(EPSILON)
    })
  })

  it('round-trips an element with no explicit fillColor as transparent (alpha 0)', () => {
    // slide2 and slide3's mainText never override fillColor, so they fall
    // back to makeTextElement's default (DEFAULT_FILL_COLOR: alpha 0).
    expect(slide2.mainText.fillColor.a).toBe(0)
    expect(slide3.mainText.fillColor.a).toBe(0)
    expect(parsed.slides[1].mainColor.a).toBe(0)
    expect(parsed.slides[2].mainColor.a).toBe(0)
  })

  it('produces distinct positions per slide (sanity check fixture varies)', () => {
    const positions = parsed.slides.map((s) => `${s.mainPosition.x},${s.mainPosition.y}`)
    expect(new Set(positions).size).toBe(3)
  })
})
