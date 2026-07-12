import { describe, it, expect } from 'vitest'
import { splitLyrics } from './splitLyrics'

describe('splitLyrics', () => {
  it('splits 10 non-blank lines with linesPerSlide=4 into 3 slides of sizes [4,4,2]', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`)
    const rawText = lines.join('\n')

    const result = splitLyrics(rawText, 4)

    expect(result).toHaveLength(3)
    expect(result.map((slide) => slide.length)).toEqual([4, 4, 2])
    expect(result[0]).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4'])
    expect(result[1]).toEqual(['Line 5', 'Line 6', 'Line 7', 'Line 8'])
    expect(result[2]).toEqual(['Line 9', 'Line 10'])
  })

  it('does not create an empty slide for a blank line between two verses', () => {
    const rawText = 'Verse one line one\nVerse one line two\n\nVerse two line one\nVerse two line two'

    const result = splitLyrics(rawText, 2)

    expect(result).toEqual([
      ['Verse one line one', 'Verse one line two'],
      ['Verse two line one', 'Verse two line two'],
    ])
    expect(result.some((slide) => slide.length === 0)).toBe(false)
  })

  it('produces zero empty slides with multiple consecutive blank lines', () => {
    const rawText = 'Line A\n\n\n\nLine B\n\n\nLine C'

    const result = splitLyrics(rawText, 1)

    expect(result).toEqual([['Line A'], ['Line B'], ['Line C']])
    expect(result.some((slide) => slide.length === 0)).toBe(false)
  })

  it('trims leading/trailing whitespace on each line', () => {
    const rawText = '  Amazing grace  \nHow sweet the sound'

    const result = splitLyrics(rawText, 2)

    expect(result).toEqual([['Amazing grace', 'How sweet the sound']])
  })

  it('does not produce leading/trailing empty slides for a song starting and ending with blank lines', () => {
    const rawText = '\n\n  \nLine 1\nLine 2\n\n  \n\n'

    const result = splitLyrics(rawText, 2)

    expect(result).toEqual([['Line 1', 'Line 2']])
  })

  it('produces exactly one slide for a single-line song', () => {
    const result = splitLyrics('Just one line', 4)

    expect(result).toEqual([['Just one line']])
  })

  it('leaves the last slide with exactly 1 line for odd line count with linesPerSlide=2', () => {
    const rawText = 'Line 1\nLine 2\nLine 3'

    const result = splitLyrics(rawText, 2)

    expect(result).toHaveLength(2)
    expect(result[1]).toHaveLength(1)
    expect(result[1]).toEqual(['Line 3'])
  })

  it('produces exactly one slide with all lines when linesPerSlide exceeds total line count', () => {
    const rawText = 'Line 1\nLine 2\nLine 3'

    const result = splitLyrics(rawText, 100)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(['Line 1', 'Line 2', 'Line 3'])
  })

  it('returns [] for a song containing only blank lines or whitespace', () => {
    expect(splitLyrics('\n\n\n', 4)).toEqual([])
    expect(splitLyrics('   \n\t\n   ', 4)).toEqual([])
    expect(splitLyrics('', 4)).toEqual([])
  })

  it('produces the same slide count and line content for CRLF and LF line endings', () => {
    const unixText = 'Line 1\nLine 2\nLine 3\nLine 4'
    const windowsText = 'Line 1\r\nLine 2\r\nLine 3\r\nLine 4'

    const unixResult = splitLyrics(unixText, 3)
    const windowsResult = splitLyrics(windowsText, 3)

    expect(windowsResult).toHaveLength(unixResult.length)
    expect(windowsResult).toEqual(unixResult)
  })

  it('splits a ~2000-line input without throwing and produces the correct slide count', () => {
    const lineCount = 2000
    const linesPerSlide = 4
    const lines = Array.from({ length: lineCount }, (_, i) => `Line ${i + 1}`)
    const rawText = lines.join('\n')

    let result: string[][] = []
    expect(() => {
      result = splitLyrics(rawText, linesPerSlide)
    }).not.toThrow()

    expect(result).toHaveLength(Math.ceil(lineCount / linesPerSlide))
    expect(result[0]).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4'])
    expect(result[result.length - 1]).toEqual(['Line 1997', 'Line 1998', 'Line 1999', 'Line 2000'])
  })
})
