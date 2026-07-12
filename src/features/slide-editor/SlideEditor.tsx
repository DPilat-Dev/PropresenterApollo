import type { ChangeEvent } from 'react'
import { useAppStore } from '../../state/store'
import { SpacingControls } from './SpacingControls'
import { TextBoxPositionControl } from './TextBoxPositionControl'

/**
 * Self-contained editor for the currently selected slide. Reads `selectedSlideId` and
 * `song` from the store directly (no props) so it can be dropped anywhere in the tree.
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

      <SpacingControls
        slideId={slide.id}
        role="main"
        style={slide.mainText.style}
        verticalAlignment={slide.mainText.verticalAlignment}
        label="Main text"
      />
      <TextBoxPositionControl slideId={slide.id} role="main" position={slide.mainText.position} label="Main text" />

      {slide.translationText !== null ? (
        <>
          <label htmlFor="slide-editor-translation-text">Translation text</label>
          <textarea
            id="slide-editor-translation-text"
            value={slide.translationText.plainText}
            onChange={handleTranslationTextChange}
          />

          <SpacingControls
            slideId={slide.id}
            role="translation"
            style={slide.translationText.style}
            verticalAlignment={slide.translationText.verticalAlignment}
            label="Translation text"
          />
          <TextBoxPositionControl
            slideId={slide.id}
            role="translation"
            position={slide.translationText.position}
            label="Translation text"
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
