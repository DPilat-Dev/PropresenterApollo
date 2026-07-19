import type { DragEvent } from 'react'
import type { Slide } from '../../types/song'
import { useAppStore } from '../../state/store'

export interface SlideListItemProps {
  slide: Slide
  index: number
  isSelected: boolean
  isCheckedForMerge: boolean
  onToggleMerge: (id: string) => void
  onDragStart: (index: number) => void
  onDragOver: (index: number, event: DragEvent<HTMLLIElement>) => void
  onDrop: (index: number) => void
}

/**
 * A single row in the slide list ("Sections" panel). Handles its own
 * selection/delete/split store interactions directly; merge-selection and
 * drag-reorder are lifted to SlideList because they need the full ordered
 * list to compute results.
 */
export function SlideListItem({
  slide,
  index,
  isSelected,
  isCheckedForMerge,
  onToggleMerge,
  onDragStart,
  onDragOver,
  onDrop,
}: SlideListItemProps) {
  const selectSlide = useAppStore((s) => s.selectSlide)
  const removeSlide = useAppStore((s) => s.removeSlide)
  const splitSlideAtLine = useAppStore((s) => s.splitSlideAtLine)

  const lines = slide.mainText.plainText.split('\n')
  const previewLines = lines.slice(0, 2)
  const canSplit = lines.length > 1
  const displayLabel = slide.label.trim().length > 0 ? slide.label : `Slide ${index + 1}`

  const handleSplit = () => {
    const midpoint = Math.ceil(lines.length / 2)
    splitSlideAtLine(slide.id, midpoint)
  }

  return (
    <li
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index, e)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(index)
      }}
      onClick={() => selectSlide(slide.id)}
      aria-current={isSelected ? 'true' : undefined}
      className="slide-list-item"
    >
      <div className="slide-list-item__top">
        <span className="badge badge--outline">{displayLabel}</span>
        <label className="slide-list-item__merge" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isCheckedForMerge}
            onChange={() => onToggleMerge(slide.id)}
            aria-label={`Select slide ${index + 1} for merge`}
          />
          Merge
        </label>
      </div>

      <p className="slide-list-item__preview">
        {previewLines.map((line, i) => (
          <span key={i}>
            {line || ' '}
            {i < previewLines.length - 1 ? ' / ' : ''}
          </span>
        ))}
        {lines.length > 2 ? ' more' : ''}
      </p>

      <div className="slide-list-item__actions">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleSplit()
          }}
          disabled={!canSplit}
        >
          Split
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            removeSlide(slide.id)
          }}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
