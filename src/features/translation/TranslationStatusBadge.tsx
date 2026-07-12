import { useAppStore } from '../../state/store'

/**
 * Shows the translation status of the currently selected slide: "Translating…" while
 * in flight, the error message if the last attempt failed, or nothing when idle/succeeded.
 * Reads `selectedSlideId` from the store itself (no required props) so it can be composed
 * freely alongside TranslationPanel or elsewhere.
 */
export function TranslationStatusBadge() {
  const selectedSlideId = useAppStore((s) => s.selectedSlideId)
  const translatingSlideIds = useAppStore((s) => s.translatingSlideIds)
  const translationErrors = useAppStore((s) => s.translationErrors)

  if (!selectedSlideId) return null

  if (translatingSlideIds.includes(selectedSlideId)) {
    return <span role="status">Translating…</span>
  }

  const error = translationErrors[selectedSlideId]
  if (error) {
    return (
      <span role="alert" style={{ color: 'red' }}>
        Translation failed: {error}
      </span>
    )
  }

  return null
}
