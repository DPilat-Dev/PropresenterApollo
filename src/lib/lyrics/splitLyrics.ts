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
export type SectionType = 'verse' | 'chorus' | 'other'

export interface LyricSection {
  /** Display name, e.g. "Verse 1", "Chorus". Empty string for the implicit
   * single section produced when the lyrics contain no section headers. */
  name: string
  type: SectionType
  /** The section's content, already chunked into slides of `linesPerSlide`. */
  slides: string[][]
}

// Worship-song section keywords. The badge color in the sidebar keys off
// whether the leading keyword is a verse, a chorus, or something else.
const CHORUS_KEYWORDS = ['chorus', 'refrain', 'pre-chorus', 'prechorus']
const VERSE_KEYWORDS = ['verse']
const OTHER_KEYWORDS = [
  'bridge',
  'intro',
  'outro',
  'interlude',
  'instrumental',
  'tag',
  'ending',
  'vamp',
  'turnaround',
  'coda',
]
const ALL_KEYWORDS = [...CHORUS_KEYWORDS, ...VERSE_KEYWORDS, ...OTHER_KEYWORDS]

/**
 * Detects whether a single (trimmed) line is a section header. Accepts an
 * optional surrounding `[...]`, an optional trailing `:`, and an optional
 * trailing number (e.g. `[Verse 1]`, `Chorus:`, `Bridge`, `Pre-Chorus 2`).
 * Returns the cleaned display name and section type, or null if it isn't a header.
 */
export function parseSectionHeader(line: string): { name: string; type: SectionType } | null {
  let text = line.trim()
  if (text.length === 0) return null

  const bracketed = text.startsWith('[') && text.endsWith(']')
  if (bracketed) text = text.slice(1, -1).trim()
  text = text.replace(/:$/, '').trim()

  const match = /^([a-z][a-z-]*)\s*(\d+)?$/i.exec(text)
  if (!match) return null
  const keyword = match[1].toLowerCase()
  if (!ALL_KEYWORDS.includes(keyword)) return null

  const type: SectionType = VERSE_KEYWORDS.includes(keyword)
    ? 'verse'
    : CHORUS_KEYWORDS.includes(keyword)
      ? 'chorus'
      : 'other'
  // Title-case the keyword for display; keep any trailing number.
  const pretty = text
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
  return { name: pretty, type }
}

/**
 * Section-aware variant of {@link splitLyrics}. Walks the raw lyrics, treating
 * recognised section-header lines (`[Verse 1]`, `Chorus:`, `Bridge`, …) as
 * boundaries: content is chunked into slides of `linesPerSlide` *within* each
 * section, so a slide never spans two sections. When the lyrics contain no
 * headers at all, returns a single section with an empty name whose `slides`
 * are identical to `splitLyrics(rawText, linesPerSlide)` — preserving the
 * historical flat behavior.
 */
export function splitLyricsIntoSections(rawText: string, linesPerSlide: number): LyricSection[] {
  if (!rawText || linesPerSlide <= 0) return []

  const rawLines = rawText.split(/\r\n|\r|\n/)

  interface Bucket {
    name: string
    type: SectionType
    lines: string[]
  }
  const buckets: Bucket[] = []
  let current: Bucket | null = null
  let sawHeader = false

  const ensureImplicit = () => {
    if (!current) {
      current = { name: '', type: 'other', lines: [] }
      buckets.push(current)
    }
  }

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim()
    if (trimmed.length === 0) continue
    const header = parseSectionHeader(trimmed)
    if (header) {
      sawHeader = true
      current = { name: header.name, type: header.type, lines: [] }
      buckets.push(current)
      continue
    }
    ensureImplicit()
    current!.lines.push(trimmed)
  }

  // Drop header-only sections with no content lines.
  const nonEmpty = buckets.filter((b) => b.lines.length > 0)
  if (nonEmpty.length === 0) return []

  // Auto-number repeated same-type headers that weren't already numbered
  // (e.g. three bare "Chorus" markers become Chorus 1 / 2 / 3).
  if (sawHeader) {
    const counts = new Map<string, number>()
    const totals = new Map<string, number>()
    for (const b of nonEmpty) totals.set(b.name, (totals.get(b.name) ?? 0) + 1)
    for (const b of nonEmpty) {
      if ((totals.get(b.name) ?? 0) > 1 && !/\d/.test(b.name)) {
        const n = (counts.get(b.name) ?? 0) + 1
        counts.set(b.name, n)
        b.name = `${b.name} ${n}`
      }
    }
  }

  return nonEmpty.map((b) => {
    const slides: string[][] = []
    for (let i = 0; i < b.lines.length; i += linesPerSlide) {
      slides.push(b.lines.slice(i, i + linesPerSlide))
    }
    return { name: b.name, type: b.type, slides }
  })
}

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
