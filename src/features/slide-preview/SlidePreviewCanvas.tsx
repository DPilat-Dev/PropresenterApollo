import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAppStore } from '../../state/store'
import type { RGBAColor, SlideLayoutPreset, Slide, TextElementState, VerticalAlignment } from '../../types/song'
import { CANVAS_WIDTH, renderFontSize } from '../../types/song'
import { pixelToPercent } from './previewGeometry'
import { interleaveGroupSize, interleaveLines, isInterleavedLayout } from '../../lib/layout/interleave'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons'

// Standard 96dpi pt->px conversion, used only to approximate relative font
// sizing in the preview — this is explicitly not pixel-exact.
const PT_TO_PX = 96 / 72

// Reasonable guess for the preview's rendered width before the first layout
// measurement lands (avoids a 0-sized flash on mount).
const FALLBACK_RENDERED_WIDTH = 640

function toCssRgba(c: RGBAColor): string {
  const r = Math.round(c.r * 255)
  const g = Math.round(c.g * 255)
  const b = Math.round(c.b * 255)
  return `rgba(${r}, ${g}, ${b}, ${c.a})`
}

function justifyContentFor(alignment: VerticalAlignment): CSSProperties['justifyContent'] {
  if (alignment === 'top') return 'flex-start'
  if (alignment === 'bottom') return 'flex-end'
  return 'center'
}

function textElementStyle(el: TextElementState, scale: number): CSSProperties {
  const pct = pixelToPercent(el.position)
  const fontSizePx = renderFontSize(el) * scale * PT_TO_PX
  const textAlign = el.style.align ?? 'center'

  // Effects: a soft drop shadow and/or a thin outline, both scaled with the
  // preview so they read the same at any preview size.
  const shadowPx = Math.max(1, Math.round(3 * scale * PT_TO_PX))
  const strokePx = Math.max(1, Math.round(1.5 * scale * PT_TO_PX))
  const textShadow = el.style.textShadow ? `0 ${shadowPx}px ${shadowPx * 1.5}px rgba(0,0,0,0.65)` : undefined
  const stroke = el.style.textOutline
    ? { WebkitTextStroke: `${strokePx}px rgba(0,0,0,0.85)` }
    : {}

  return {
    position: 'absolute',
    left: `${pct.leftPct}%`,
    top: `${pct.topPct}%`,
    width: `${pct.widthPct}%`,
    height: `${pct.heightPct}%`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: justifyContentFor(el.verticalAlignment),
    textAlign,
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    fontFamily: el.style.fontFamily,
    fontSize: `${fontSizePx}px`,
    lineHeight: el.style.lineSpacingPct / 100,
    color: toCssRgba(el.style.color),
    fontWeight: el.style.bold ? 'bold' : 'normal',
    fontStyle: el.style.italic ? 'italic' : 'normal',
    textShadow,
    ...stroke,
    opacity: el.opacity,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  }
}

/** Text styling (no positioning) for one woven line in an interleaved layout,
 * taken from whichever role that line belongs to. */
function lineTextStyle(el: TextElementState, scale: number): CSSProperties {
  const fontSizePx = renderFontSize(el) * scale * PT_TO_PX
  const shadowPx = Math.max(1, Math.round(3 * scale * PT_TO_PX))
  const strokePx = Math.max(1, Math.round(1.5 * scale * PT_TO_PX))
  return {
    fontFamily: el.style.fontFamily,
    fontSize: `${fontSizePx}px`,
    lineHeight: el.style.lineSpacingPct / 100,
    color: toCssRgba(el.style.color),
    fontWeight: el.style.bold ? 'bold' : 'normal',
    fontStyle: el.style.italic ? 'italic' : 'normal',
    textAlign: el.style.align ?? 'center',
    whiteSpace: 'pre-wrap',
    textShadow: el.style.textShadow ? `0 ${shadowPx}px ${shadowPx * 1.5}px rgba(0,0,0,0.65)` : undefined,
    ...(el.style.textOutline ? { WebkitTextStroke: `${strokePx}px rgba(0,0,0,0.85)` } : {}),
  }
}

function EmptyCanvas() {
  return (
    <div
      style={{
        aspectRatio: '16 / 9',
        width: '100%',
        background: 'rgba(0, 0, 0, 1)',
        color: 'rgba(255, 255, 255, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      No slides yet
    </div>
  )
}

/**
 * Renders a CSS approximation of the currently-selected slide as a 16:9 box.
 * Falls back to the first slide in the group's authoritative order if none
 * is selected, or an empty dark box if there are no slides at all.
 */
export function SlidePreviewCanvas() {
  const song = useAppStore((s) => s.song)
  const selectedSlideId = useAppStore((s) => s.selectedSlideId)
  const selectSlide = useAppStore((s) => s.selectSlide)

  const containerRef = useRef<HTMLDivElement>(null)
  const [renderedWidth, setRenderedWidth] = useState(FALLBACK_RENDERED_WIDTH)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    if (typeof ResizeObserver === 'undefined') {
      if (el.clientWidth > 0) setRenderedWidth(el.clientWidth)
      return undefined
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) setRenderedWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  let slide: Slide | undefined
  let orderedIds: string[] = []
  let slideIndex = -1
  if (song && song.slides.length > 0) {
    const group = song.groups[0]
    orderedIds = group ? group.slideIds : song.slides.map((s) => s.id)
    const slidesById = new Map(song.slides.map((s) => [s.id, s]))

    slide = selectedSlideId ? slidesById.get(selectedSlideId) : undefined
    if (!slide) {
      const firstId = orderedIds[0]
      slide = slidesById.get(firstId) ?? song.slides[0]
    }
    slideIndex = slide ? orderedIds.indexOf(slide.id) : -1
  }

  const scale = renderedWidth / CANVAS_WIDTH
  const displayLabel = slide && slide.label.trim().length > 0 ? slide.label : slide ? `Slide ${slideIndex + 1}` : ''

  // Layout preset drives which roles show; box placement (stacked vs side by
  // side) is baked into each element's stored position by the auto-layout, so
  // the preview just renders those positions directly.
  const layout: SlideLayoutPreset = song?.layout ?? 'original-translation'
  const hasTranslation = slide?.translationText != null
  const interleaved = hasTranslation && isInterleavedLayout(layout)
  const showMain = layout !== 'translation-only' || !hasTranslation
  const showTranslation = layout !== 'original-only'

  const goToOffset = (offset: number) => {
    if (slideIndex === -1) return
    const nextIndex = slideIndex + offset
    if (nextIndex < 0 || nextIndex >= orderedIds.length) return
    selectSlide(orderedIds[nextIndex])
  }

  return (
    <section aria-labelledby="slide-preview-heading">
      <h2 id="slide-preview-heading">Preview</h2>

      <div ref={containerRef} style={{ width: '100%' }}>
        {!slide ? (
          <EmptyCanvas />
        ) : (
          <div
            data-testid="slide-preview-canvas"
            className="slide-preview-canvas"
            style={{
              position: 'relative',
              aspectRatio: '16 / 9',
              width: '100%',
              overflow: 'hidden',
              background: toCssRgba(slide.backgroundColor),
            }}
          >
            {interleaved && slide.translationText ? (
              <div data-testid="slide-preview-main-text" style={textElementStyle(slide.mainText, scale)}>
                {interleaveLines(
                  slide.mainText.plainText,
                  slide.translationText.plainText,
                  interleaveGroupSize(layout),
                ).map((line, i) => (
                  <div
                    key={i}
                    style={lineTextStyle(line.role === 'main' ? slide.mainText : slide.translationText!, scale)}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {showMain && (
                  <div data-testid="slide-preview-main-text" style={textElementStyle(slide.mainText, scale)}>
                    {slide.mainText.plainText}
                  </div>
                )}
                {slide.translationText !== null && showTranslation && (
                  <div
                    data-testid="slide-preview-translation-text"
                    style={textElementStyle(slide.translationText, scale)}
                  >
                    {slide.translationText.plainText}
                  </div>
                )}
              </>
            )}
            <span className="slide-preview-canvas__label">{displayLabel}</span>
          </div>
        )}
      </div>

      {slide && orderedIds.length > 0 && (
        <div className="slide-preview__nav">
          <button
            type="button"
            className="slide-preview__nav-btn"
            aria-label="Previous slide"
            onClick={() => goToOffset(-1)}
            disabled={slideIndex <= 0}
          >
            <ChevronLeftIcon />
          </button>
          <span className="slide-preview__counter">
            {slideIndex + 1} / {orderedIds.length}
          </span>
          <button
            type="button"
            className="slide-preview__nav-btn"
            aria-label="Next slide"
            onClick={() => goToOffset(1)}
            disabled={slideIndex === -1 || slideIndex >= orderedIds.length - 1}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}

      <p>
        <small>Preview is an approximation — actual ProPresenter rendering may vary.</small>
      </p>
    </section>
  )
}
