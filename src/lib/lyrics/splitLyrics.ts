/**
 * Splits raw lyrics text into slides.
 *
 * - Splits on any line ending (\r\n, \r, or \n).
 * - Trims leading/trailing whitespace on each line.
 * - Filters out blank lines before chunking, so blank lines never produce
 *   empty slides and leading/trailing blank lines never produce
 *   leading/trailing empty slides.
 * - Chunks the remaining non-blank lines into groups of `linesPerSlide`,
 *   preserving original order. The final chunk may be smaller than
 *   `linesPerSlide`.
 *
 * Pure function: no side effects, no external dependencies.
 */
export function splitLyrics(rawText: string, linesPerSlide: number): string[][] {
  if (!rawText || linesPerSlide <= 0) {
    return []
  }

  const rawLines = rawText.split(/\r\n|\r|\n/)

  const lines: string[] = []
  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim()
    if (trimmed.length > 0) {
      lines.push(trimmed)
    }
  }

  if (lines.length === 0) {
    return []
  }

  const slides: string[][] = []
  for (let i = 0; i < lines.length; i += linesPerSlide) {
    slides.push(lines.slice(i, i + linesPerSlide))
  }

  return slides
}
