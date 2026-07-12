import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAppStore } from '../../state/store'
import type { RGBAColor, Slide, TextElementState, VerticalAlignment } from '../../types/song'
import { CANVAS_WIDTH } from '../../types/song'
import { pixelToPercent } from './previewGeometry'

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
  const fontSizePx = el.style.fontSizePt * scale * PT_TO_PX

  return {
    position: 'absolute',
    left: `${pct.leftPct}%`,
    top: `${pct.topPct}%`,
    width: `${pct.widthPct}%`,
    height: `${pct.heightPct}%`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: justifyContentFor(el.verticalAlignment),
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    fontFamily: el.style.fontFamily,
    fontSize: `${fontSizePx}px`,
    lineHeight: el.style.lineSpacingPct / 100,
    color: toCssRgba(el.style.color),
    fontWeight: el.style.bold ? 'bold' : 'normal',
    fontStyle: el.style.italic ? 'italic' : 'normal',
    opacity: el.opacity,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
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
  if (song && song.slides.length > 0) {
    const group = song.groups[0]
    const orderedIds = group ? group.slideIds : song.slides.map((s) => s.id)
    const slidesById = new Map(song.slides.map((s) => [s.id, s]))

    slide = selectedSlideId ? slidesById.get(selectedSlideId) : undefined
    if (!slide) {
      const firstId = orderedIds[0]
      slide = slidesById.get(firstId) ?? song.slides[0]
    }
  }

  const scale = renderedWidth / CANVAS_WIDTH

  return (
    <section aria-labelledby="slide-preview-heading">
      <h2 id="slide-preview-heading">Preview</h2>

      <div ref={containerRef} style={{ width: '100%' }}>
        {!slide ? (
          <EmptyCanvas />
        ) : (
          <div
            data-testid="slide-preview-canvas"
            style={{
              position: 'relative',
              aspectRatio: '16 / 9',
              width: '100%',
              overflow: 'hidden',
              background: toCssRgba(slide.backgroundColor),
            }}
          >
            <div data-testid="slide-preview-main-text" style={textElementStyle(slide.mainText, scale)}>
              {slide.mainText.plainText}
            </div>
            {slide.translationText !== null && (
              <div
                data-testid="slide-preview-translation-text"
                style={textElementStyle(slide.translationText, scale)}
              >
                {slide.translationText.plainText}
              </div>
            )}
          </div>
        )}
      </div>

      <p>
        <small>Preview is an approximation — actual ProPresenter rendering may vary.</small>
      </p>
    </section>
  )
}
