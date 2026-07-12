import { useState } from 'react'
import type { DragEvent } from 'react'
import { useAppStore } from '../../state/store'
import { SlideListItem } from './SlideListItem'

/**
 * Displays the slides for the current song in the order given by
 * `song.groups[0].slideIds` (the authoritative order — NOT `song.slides`
 * array order, which can drift from display order after merges/splits).
 *
 * Supports reordering via native HTML5 drag-and-drop, multi-select merge via
 * checkboxes, and per-slide midpoint split.
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
      <section aria-labelledby="slide-list-heading">
        <h2 id="slide-list-heading">Slides</h2>
        <p>Paste lyrics above to get started.</p>
      </section>
    )
  }

  const group = song.groups[0]
  const orderedIds = group ? group.slideIds : song.slides.map((s) => s.id)
  const slidesById = new Map(song.slides.map((s) => [s.id, s]))
  const orderedSlides = orderedIds
    .map((id) => slidesById.get(id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)

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
    <section aria-labelledby="slide-list-heading">
      <h2 id="slide-list-heading">Slides</h2>

      <button type="button" onClick={handleMergeClick} disabled={mergeSelection.size < 2}>
        Merge selected
      </button>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {orderedSlides.map((slide, index) => (
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
    </section>
  )
}
