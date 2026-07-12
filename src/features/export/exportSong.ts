import type { Song } from '../../types/song'
import { exportSongToPro6Xml } from '../../lib/pro6/pro6Builder'

// Characters illegal in Windows/Mac/Linux filenames.
const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/g

/** True for ASCII control characters (C0 range and DEL), which are also illegal in filenames. */
function isControlChar(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code <= 31 || code === 127
}

/** Strips filesystem-illegal characters from a song title and collapses whitespace. */
export function sanitizeFilename(title: string): string {
  // Collapse whitespace (including tabs/newlines) into plain spaces first, since tabs
  // and newlines are themselves in the control-character range (<= 31) and would
  // otherwise be deleted outright by the control-character strip below instead of
  // being normalized to a space.
  const collapsedWhitespace = title.replace(/\s+/g, ' ')
  const withoutIllegal = collapsedWhitespace.replace(ILLEGAL_FILENAME_CHARS, '')
  const withoutControl = Array.from(withoutIllegal)
    .filter((ch) => !isControlChar(ch))
    .join('')
  const trimmed = withoutControl.trim()
  return trimmed.length > 0 ? trimmed : 'untitled'
}

/** Builds the download filename (always ending in `.pro6`) for a song. */
export function buildPro6Filename(title: string): string {
  return `${sanitizeFilename(title)}.pro6`
}

/**
 * Serializes a Song to pro6 XML and triggers a browser download of it.
 * Forces the filename/extension explicitly via the anchor's `download` attribute
 * rather than relying on MIME-type sniffing.
 */
export function downloadSongAsPro6(song: Song): void {
  const xml = exportSongToPro6Xml(song)
  const filename = buildPro6Filename(song.title)

  const blob = new Blob([xml], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    URL.revokeObjectURL(url)
  }
}
