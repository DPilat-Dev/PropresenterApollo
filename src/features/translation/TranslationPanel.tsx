import { useAppStore } from '../../state/store'
import { TranslationStatusBadge } from './TranslationStatusBadge'

const LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Mandarin Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
  { code: 'hi', label: 'Hindi' },
]

/**
 * Self-contained translation controls: target language picker, "translate all" bulk
 * action, and a "translate this slide" action for the currently selected slide. Reads
 * everything it needs from the store directly (no required props).
 */
export function TranslationPanel() {
  const targetLanguage = useAppStore((s) => s.targetLanguage)
  const setTargetLanguage = useAppStore((s) => s.setTargetLanguage)
  const translateAllSlides = useAppStore((s) => s.translateAllSlides)
  const translateSlide = useAppStore((s) => s.translateSlide)
  const translatingSlideIds = useAppStore((s) => s.translatingSlideIds)
  const selectedSlideId = useAppStore((s) => s.selectedSlideId)

  const isTranslating = translatingSlideIds.length > 0
  const disableAll = isTranslating || targetLanguage === null
  const disableSingle = isTranslating || targetLanguage === null || selectedSlideId === null

  return (
    <div className="translation-panel">
      <h2>Translation</h2>

      <label htmlFor="translation-target-language">Target language</label>
      <select
        id="translation-target-language"
        value={targetLanguage ?? ''}
        onChange={(e) => setTargetLanguage(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">None</option>
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label} ({lang.code})
          </option>
        ))}
      </select>

      <button type="button" onClick={() => void translateAllSlides()} disabled={disableAll}>
        {isTranslating ? 'Translating…' : 'Translate all slides'}
      </button>

      <button
        type="button"
        onClick={() => selectedSlideId && void translateSlide(selectedSlideId)}
        disabled={disableSingle}
      >
        Translate this slide
      </button>

      <TranslationStatusBadge />
    </div>
  )
}
