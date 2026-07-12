import { describe, expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { exportSongToPro6Xml } from './pro6Builder'
import type { Slide, SlideGroup, Song, TextElementState } from '../../types/song'

function makeTextElement(overrides: Partial<TextElementState> = {}): TextElementState {
  return {
    id: 'a1111111-1111-1111-1111-111111111111',
    role: 'main',
    plainText: 'Amazing grace',
    position: { x: 160, y: 700, z: 0, width: 1600, height: 300 },
    style: { fontFamily: 'Arial', fontSizePt: 60, lineSpacingPct: 100, color: { r: 1, g: 1, b: 1, a: 1 } },
    verticalAlignment: 'bottom',
    opacity: 1,
    rotation: 0,
    ...overrides,
  }
}

function makeSlide(overrides: Partial<Slide> = {}): Slide {
  return {
    id: 'b2222222-2222-2222-2222-222222222222',
    label: 'Verse 1',
    notes: '',
    enabled: true,
    backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
    mainText: makeTextElement(),
    translationText: null,
    order: 0,
    ...overrides,
  }
}

function makeSong(slides: Slide[], groups: SlideGroup[]): Song {
  return {
    id: 'song-1',
    title: 'Amazing Grace',
    rawLyrics: 'Amazing grace, how sweet the sound',
    splitSettings: { linesPerSlide: 2, skipBlankLines: true },
    slides,
    groups,
    targetLanguage: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('exportSongToPro6Xml', () => {
  it('produces well-formed XML parseable by fast-xml-parser', () => {
    const slide1 = makeSlide({ id: 's1' })
    const slide2 = makeSlide({ id: 's2', label: 'Verse 2' })
    const group: SlideGroup = { id: 'g1', name: 'Verse', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, slideIds: ['s1', 's2'] }
    const song = makeSong([slide1, slide2], [group])

    const xml = exportSongToPro6Xml(song)
    const parser = new XMLParser({ ignoreAttributes: false })
    expect(() => parser.parse(xml)).not.toThrow()
  })

  it('has RVPresentationDocument as the root element', () => {
    const slide1 = makeSlide({ id: 's1' })
    const group: SlideGroup = { id: 'g1', name: 'Verse', color: { r: 0, g: 0, b: 0, a: 1 }, slideIds: ['s1'] }
    const song = makeSong([slide1], [group])

    const xml = exportSongToPro6Xml(song)
    const parser = new XMLParser({ ignoreAttributes: false })
    const parsed = parser.parse(xml)
    expect(Object.keys(parsed)).toContain('RVPresentationDocument')
  })

  it('produces one RVDisplaySlide per slide in the Song', () => {
    const slides = [
      makeSlide({ id: 's1' }),
      makeSlide({ id: 's2' }),
      makeSlide({ id: 's3' }),
    ]
    const group: SlideGroup = {
      id: 'g1',
      name: 'Verse',
      color: { r: 0, g: 0, b: 0, a: 1 },
      slideIds: ['s1', 's2', 's3'],
    }
    const song = makeSong(slides, [group])

    const xml = exportSongToPro6Xml(song)
    const matches = xml.match(/<RVDisplaySlide/g) ?? []
    expect(matches.length).toBe(3)
  })

  it('produces exactly one RVTextElement for a slide with no translation', () => {
    const slide = makeSlide({ id: 's1', translationText: null })
    const group: SlideGroup = { id: 'g1', name: 'Verse', color: { r: 0, g: 0, b: 0, a: 1 }, slideIds: ['s1'] }
    const song = makeSong([slide], [group])

    const xml = exportSongToPro6Xml(song)
    const matches = xml.match(/<RVTextElement/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('produces exactly two RVTextElements for a slide with a translation', () => {
    const slide = makeSlide({
      id: 's1',
      translationText: makeTextElement({
        id: 'c3333333-3333-3333-3333-333333333333',
        role: 'translation',
        plainText: 'Gracia asombrosa',
        position: { x: 160, y: 900, z: 0, width: 1600, height: 120 },
      }),
    })
    const group: SlideGroup = { id: 'g1', name: 'Verse', color: { r: 0, g: 0, b: 0, a: 1 }, slideIds: ['s1'] }
    const song = makeSong([slide], [group])

    const xml = exportSongToPro6Xml(song)
    const matches = xml.match(/<RVTextElement/g) ?? []
    expect(matches.length).toBe(2)
  })

  it('produces one RVSlideGrouping per SlideGroup', () => {
    const slide1 = makeSlide({ id: 's1' })
    const slide2 = makeSlide({ id: 's2' })
    const group1: SlideGroup = { id: 'g1', name: 'Verse', color: { r: 0, g: 0, b: 0, a: 1 }, slideIds: ['s1'] }
    const group2: SlideGroup = { id: 'g2', name: 'Chorus', color: { r: 0, g: 0, b: 0, a: 1 }, slideIds: ['s2'] }
    const song = makeSong([slide1, slide2], [group1, group2])

    const xml = exportSongToPro6Xml(song)
    const matches = xml.match(/<RVSlideGrouping/g) ?? []
    expect(matches.length).toBe(2)
  })
})
