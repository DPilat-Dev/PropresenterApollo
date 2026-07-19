import type { ChangeEvent } from 'react'
import { useAppStore } from '../../state/store'

/**
 * Self-contained editor for the currently selected slide's raw text content
 * (main + translation). Reads `selectedSlideId` and `song` from the store
 * directly (no props) so it can be dropped anywhere in the tree. Typography,
 * color, and placement controls for the same slide live in the STYLE panel
 * (see `src/features/style-panel`), not here - this component owns text
 * content only.
 *
 * Important product requirement: manual edits to the *translation* textarea must go
 * through `setTranslationOverride`, not `updateSlideText`, so that the translation
 * cache entry is marked `overridden` and a later "translate all" bulk run won't clobber
 * the user's manual correction. See translationSlice.ts `setTranslationOverride`.
 */
export function SlideEditor() {
  const song = useAppStore((s) => s.song)
  const selectedSlideId = useAppStore((s) => s.selectedSlideId)
  const updateSlideText = useAppStore((s) => s.updateSlideText)
  const setTranslationOverride = useAppStore((s) => s.setTranslationOverride)

  const slide = song && selectedSlideId ? (song.slides.find((s) => s.id === selectedSlideId) ?? null) : null

  if (!song || !slide) {
    return (
      <div className="slide-editor slide-editor--empty">
        <p>Select a slide to edit it.</p>
      </div>
    )
  }

  const handleMainTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateSlideText(slide.id, 'main', e.target.value)
  }

  // NOT updateSlideText: setTranslationOverride also marks the cache entry as
  // overridden so translateAllSlides skips it on the next bulk re-translate.
  const handleTranslationTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTranslationOverride(slide.id, e.target.value)
  }

  return (
    <div className="slide-editor">
      <h2>Edit slide</h2>

      <label htmlFor="slide-editor-main-text">Main text</label>
      <textarea id="slide-editor-main-text" value={slide.mainText.plainText} onChange={handleMainTextChange} />

      {slide.translationText !== null ? (
        <>
          <label htmlFor="slide-editor-translation-text">Translation text</label>
          <textarea
            id="slide-editor-translation-text"
            value={slide.translationText.plainText}
            onChange={handleTranslationTextChange}
          />
        </>
      ) : (
        <p className="slide-editor__no-translation">
          No translation yet — use the Translation panel to generate one.
        </p>
      )}
    </div>
  )
}
