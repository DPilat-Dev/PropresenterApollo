import { useRef, useState } from 'react'
import { useAppStore } from '../../state/store'

const DEFAULT_LINES_PER_SLIDE = 2

/**
 * Paste-or-upload lyrics entry point. Populates a local textarea (from typing,
 * pasting, or loading a .txt file) and, on explicit user action, imports the
 * text into the store via `importLyrics`, which creates the song implicitly
 * if one doesn't exist yet.
 */
export function LyricsInput({ onImported }: { onImported?: () => void } = {}) {
  const importLyrics = useAppStore((s) => s.importLyrics)

  const [text, setText] = useState('')
  const [linesPerSlide, setLinesPerSlide] = useState(DEFAULT_LINES_PER_SLIDE)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : ''
      setText(content)
    }
    reader.readAsText(file)

    // Allow re-selecting the same file later (e.g. after clearing the textarea).
    event.target.value = ''
  }

  const handleImport = () => {
    if (text.trim().length === 0) return
    importLyrics(text, linesPerSlide)
    onImported?.()
  }

  const handleLinesPerSlideChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    setLinesPerSlide(value)
  }

  return (
    <section aria-labelledby="lyrics-input-heading">
      <h2 id="lyrics-input-heading">Lyrics</h2>

      <div>
        <label htmlFor="lyrics-textarea">Paste lyrics</label>
        <br />
        <textarea
          id="lyrics-textarea"
          rows={12}
          cols={60}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type lyrics here..."
        />
      </div>

      <div>
        <label htmlFor="lyrics-file-input">Or load a .txt file</label>
        <br />
        <input
          id="lyrics-file-input"
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <label htmlFor="lines-per-slide-input">Lines per slide</label>
        <br />
        <input
          id="lines-per-slide-input"
          type="number"
          min={1}
          step={1}
          value={linesPerSlide}
          onChange={handleLinesPerSlideChange}
        />
        <p>Blank lines are automatically skipped and don't count toward the total.</p>
      </div>

      <button type="button" onClick={handleImport} disabled={text.trim().length === 0}>
        Generate Slides
      </button>
    </section>
  )
}
