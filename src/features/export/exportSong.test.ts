import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Slide, SlideGroup, Song, TextElementState } from '../../types/song'
import { DEFAULT_FILL_COLOR } from '../../types/song'
import { buildPro6Filename, downloadSongAsPro6, sanitizeFilename } from './exportSong'

function makeTextElement(overrides: Partial<TextElementState> = {}): TextElementState {
  return {
    id: 'a1111111-1111-1111-1111-111111111111',
    role: 'main',
    plainText: 'Amazing grace',
    position: { x: 160, y: 700, z: 0, width: 1600, height: 300 },
    style: { fontFamily: 'Arial', fontSizePt: 60, lineSpacingPct: 100, color: { r: 1, g: 1, b: 1, a: 1 } },
    fillColor: { ...DEFAULT_FILL_COLOR },
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

function makeSong(overrides: Partial<Song> = {}): Song {
  const slide = makeSlide()
  const group: SlideGroup = { id: 'g1', name: 'Verse', color: { r: 0, g: 0, b: 0, a: 1 }, slideIds: [slide.id] }
  return {
    id: 'song-1',
    title: 'Amazing Grace',
    rawLyrics: 'Amazing grace, how sweet the sound',
    splitSettings: { linesPerSlide: 2, skipBlankLines: true },
    slides: [slide],
    groups: [group],
    targetLanguage: null,
    artist: '',
    sourceLanguage: 'en',
    translationCache: {},
    layout: 'original-translation',
    thirdLanguageColor: { r: 0.556863, g: 0.803922, b: 0.901961, a: 1 },
    published: false,
    autoFitBox: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('sanitizeFilename', () => {
  it('leaves an already-safe title untouched', () => {
    expect(sanitizeFilename('Amazing Grace')).toBe('Amazing Grace')
  })

  it('strips characters illegal on Windows/Mac/Linux filesystems', () => {
    expect(sanitizeFilename('Song: "Grace"? <A/B>|C*\\D')).toBe('Song Grace ABCD')
  })

  it('strips ASCII control characters', () => {
    const withControlChars = 'Song' + String.fromCharCode(7) + 'Title' + String.fromCharCode(31)
    expect(sanitizeFilename(withControlChars)).toBe('SongTitle')
  })

  it('collapses runs of whitespace', () => {
    expect(sanitizeFilename('Song    Title\t\ttoo')).toBe('Song Title too')
  })

  it('falls back to "untitled" when sanitization empties the title', () => {
    expect(sanitizeFilename('///???***')).toBe('untitled')
  })

  it('falls back to "untitled" for a blank/whitespace-only title', () => {
    expect(sanitizeFilename('   ')).toBe('untitled')
  })
})

describe('buildPro6Filename', () => {
  it('always appends the .pro6 extension', () => {
    expect(buildPro6Filename('Amazing Grace')).toBe('Amazing Grace.pro6')
  })

  it('uses the untitled fallback with the .pro6 extension', () => {
    expect(buildPro6Filename('***')).toBe('untitled.pro6')
  })
})

describe('downloadSongAsPro6', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock-url')
    revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clickSpy.mockRestore()
  })

  it('does not throw for a valid song and drives the download flow', () => {
    const song = makeSong()

    expect(() => downloadSongAsPro6(song)).not.toThrow()

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const [blobArg] = createObjectURL.mock.calls[0]
    expect(blobArg).toBeInstanceOf(Blob)

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('sets the anchor download attribute to the sanitized filename', () => {
    const song = makeSong({ title: 'Grace: "Amazing"?' })
    let capturedDownload: string | undefined

    clickSpy.mockImplementation(function (this: HTMLAnchorElement) {
      capturedDownload = this.download
    })

    downloadSongAsPro6(song)

    expect(capturedDownload).toBe('Grace Amazing.pro6')
  })
})
