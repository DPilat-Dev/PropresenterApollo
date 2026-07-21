import { useState } from 'react'
import type { DragEvent } from 'react'
import { useAppStore } from '../../state/store'
import type { Slide } from '../../types/song'
import { parseSectionHeader } from '../../lib/lyrics/splitLyrics'
import { SlideListItem } from './SlideListItem'

/**
 * Groups the ordered slides into contiguous runs sharing the same `label`
 * (section name). Slides with an empty label collapse into a single unnamed
 * "Slides" run. Each run remembers the global index of its first slide so the
 * flat drag-reorder indices stay correct across sections.
 */
interface SlideSection {
  name: string
  type: 'verse' | 'chorus' | 'other'
  slides: { slide: Slide; index: number }[]
}

function groupIntoSections(orderedSlides: Slide[]): SlideSection[] {
  const sections: SlideSection[] = []
  orderedSlides.forEach((slide, index) => {
    const name = slide.label.trim()
    const last = sections[sections.length - 1]
    if (last && last.name === name) {
      last.slides.push({ slide, index })
      return
    }
    const parsed = name ? parseSectionHeader(name) : null
    sections.push({
      name: name || 'Slides',
      type: parsed?.type ?? 'other',
      slides: [{ slide, index }],
    })
  })
  return sections
}

const BADGE_CLASS: Record<SlideSection['type'], string> = {
  verse: 'badge--a',
  chorus: 'badge--b',
  other: '',
}

/**
 * The editor's left "Sections" rail. Shows the current song's slides grouped
 * into named sections (verse / chorus / …), in the authoritative order from
 * `song.groups[0].slideIds`. Supports drag reorder, multi-select merge, and
 * per-slide split/delete.
 */
export function SlideList() {
  const song = useAppStore((s) => s.song)
  const selectedSlideId = useAppStore((s) => s.selectedSlideId)
  const reorderSlides = useAppStore((s) => s.reorderSlides)
  const mergeSlides = useAppStore((s) => s.mergeSlides)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set())

  if (!song || song.slides.length === 0) {
    return (
      <section aria-labelledby="slide-list-heading" className="slide-list">
        <h3 id="slide-list-heading">Sections</h3>
        <p className="slide-list__empty">Paste lyrics above to get started.</p>
      </section>
    )
  }

  const group = song.groups[0]
  const orderedIds = group ? group.slideIds : song.slides.map((s) => s.id)
  const slidesById = new Map(song.slides.map((s) => [s.id, s]))
  const orderedSlides = orderedIds
    .map((id) => slidesById.get(id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
  const sections = groupIntoSections(orderedSlides)

  const handleToggleMerge = (id: string) => {
    setMergeSelection((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDragStart = (index: number) => setDragIndex(index)

  // Nothing to do here beyond the preventDefault() already done in
  // SlideListItem — that's what permits a drop to occur on this element.
  const handleDragOver = (_index: number, _event: DragEvent<HTMLLIElement>) => {}

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      return
    }
    const newOrder = [...orderedIds]
    const [moved] = newOrder.splice(dragIndex, 1)
    newOrder.splice(dropIndex, 0, moved)
    reorderSlides(newOrder)
    setDragIndex(null)
  }

  const handleMergeClick = () => {
    // Preserve list order, not click order, per mergeSlides' contract.
    const idsInOrder = orderedIds.filter((id) => mergeSelection.has(id))
    if (idsInOrder.length < 2) return
    mergeSlides(idsInOrder)
    setMergeSelection(new Set())
  }

  return (
    <section aria-labelledby="slide-list-heading" className="slide-list">
      <div className="slide-list__header">
        <h3 id="slide-list-heading">Sections</h3>
        <button
          type="button"
          className="slide-list__merge-btn"
          onClick={handleMergeClick}
          disabled={mergeSelection.size < 2}
        >
          Merge selected
        </button>
      </div>

      <div className="slide-list__sections">
        {sections.map((section, si) => (
          <div className="slide-section" key={`${section.name}-${si}`}>
            <div className="slide-section__head">
              <span className={`badge ${BADGE_CLASS[section.type]}`.trim()}>{section.type === 'other' ? 'section' : section.type}</span>
              <span className="slide-section__name">{section.name}</span>
              <span className="slide-section__count">
                {section.slides.length} {section.slides.length === 1 ? 'slide' : 'slides'}
              </span>
            </div>
            <ul className="slide-section__list">
              {section.slides.map(({ slide, index }) => (
                <SlideListItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isSelected={selectedSlideId === slide.id}
                  isCheckedForMerge={mergeSelection.has(slide.id)}
                  onToggleMerge={handleToggleMerge}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
