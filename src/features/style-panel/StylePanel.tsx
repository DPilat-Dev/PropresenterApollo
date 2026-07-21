import { useState } from 'react'
import { useAppStore } from '../../state/store'
import type { TextRole } from '../../state/types'
import { LayoutTab } from './LayoutTab'
import { TypeTab } from './TypeTab'
import { ColorsTab } from './ColorsTab'
import { QualityTab } from './QualityTab'

type StyleTabKey = 'layout' | 'type' | 'colors' | 'quality'

const TABS: ReadonlyArray<{ key: StyleTabKey; label: string }> = [
  { key: 'layout', label: 'Layout' },
  { key: 'type', label: 'Type' },
  { key: 'colors', label: 'Colors' },
  { key: 'quality', label: 'Quality' },
]

/**
 * Right-hand STYLE panel in the slide editor: a segmented Layout/Type/Colors/
 * Quality tab bar, plus a shared "which text element am I editing" role
 * toggle (Main text / Translation text) used by the Layout and Type tabs
 * (Colors shows both roles' colors side by side, so it doesn't need one).
 */
export function StylePanel() {
  const song = useAppStore((s) => s.song)
  const selectedSlideId = useAppStore((s) => s.selectedSlideId)
  const [activeTab, setActiveTab] = useState<StyleTabKey>('layout')
  const [preferredRole, setPreferredRole] = useState<TextRole>('main')

  if (!song) return null

  const slide = selectedSlideId ? (song.slides.find((s) => s.id === selectedSlideId) ?? null) : null

  // Type and Colors are song-wide settings, so they don't require a selection -
  // they read their "current value" from the selected slide when there is one,
  // otherwise from the first slide as a representative. (Layout's per-slide
  // Position section still guards on the real `slide` itself.)
  const representativeSlide = slide ?? song.slides[0] ?? null

  // Falls back to 'main' when translation text doesn't exist, even if the
  // user had it selected on a previous slide that did have one.
  const role: TextRole =
    preferredRole === 'translation' && representativeSlide?.translationText === null ? 'main' : preferredRole
  const showRoleToggle =
    activeTab === 'type' && representativeSlide !== null && representativeSlide.translationText !== null

  return (
    <section aria-labelledby="style-panel-heading" className="style-panel">
      <h2 id="style-panel-heading">Style</h2>

      <div className="segmented style-panel__tabs" role="tablist" aria-label="Style sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className="segmented__item"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showRoleToggle && (
        <div className="segmented style-panel__role-toggle" role="group" aria-label="Editing text element">
          <button
            type="button"
            className="segmented__item"
            aria-pressed={role === 'main'}
            onClick={() => setPreferredRole('main')}
          >
            Main text
          </button>
          <button
            type="button"
            className="segmented__item"
            aria-pressed={role === 'translation'}
            onClick={() => setPreferredRole('translation')}
          >
            Translation text
          </button>
        </div>
      )}

      {/* Layout hosts song-level controls (presets, Quick Edit, translation,
          max lines, text-box sizing); its per-slide "Position" section guards
          on the real `slide` itself. Type/Colors are song-wide and only need a
          representative slide to read current values from - they show an empty
          state only when the song genuinely has no slides yet. */}
      {activeTab === 'layout' && <LayoutTab />}
      {activeTab === 'type' &&
        (representativeSlide ? (
          <TypeTab slide={representativeSlide} role={role} />
        ) : (
          <p className="style-panel__empty">Add lyrics to create slides first.</p>
        ))}
      {activeTab === 'colors' &&
        (representativeSlide ? (
          <ColorsTab slide={representativeSlide} />
        ) : (
          <p className="style-panel__empty">Add lyrics to create slides first.</p>
        ))}
      {activeTab === 'quality' && <QualityTab />}
    </section>
  )
}
