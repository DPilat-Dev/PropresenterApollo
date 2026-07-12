import { useAppStore } from '../../state/store'
import { downloadSongAsPro6 } from './exportSong'

/**
 * Self-contained export trigger. Reads `song` from the store directly (no required
 * props). Disabled when there is no song or the song has no slides — exporting an
 * empty deck is a risk the architecture plan calls out to prevent in the UI.
 */
export function ExportButton() {
  const song = useAppStore((s) => s.song)
  const disabled = song === null || song.slides.length === 0

  const handleClick = () => {
    if (!song) return
    downloadSongAsPro6(song)
  }

  return (
    <button type="button" onClick={handleClick} disabled={disabled}>
      Export to ProPresenter 6
    </button>
  )
}
