import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../state/store'
import { QuickEditPanel } from './QuickEditPanel'

beforeEach(() => {
  useAppStore.setState({
    song: null,
    selectedSlideId: null,
    targetLanguage: null,
    translatingSlideIds: [],
    translationErrors: {},
    cache: {},
  })
})

function importTwoSlides() {
  useAppStore.getState().importLyrics('line one\nline two\n\nline three\nline four', 2)
  return useAppStore.getState().song!
}

describe('QuickEditPanel', () => {
  it('renders nothing when there is no song', () => {
    const { container } = render(<QuickEditPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the song has no slides', () => {
    useAppStore.getState().newSong('Empty Song')
    const { container } = render(<QuickEditPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('selecting Center in the main-text row updates every slide, not just one', async () => {
    const song = importTwoSlides()
    expect(song.slides.length).toBeGreaterThanOrEqual(2)
    const user = userEvent.setup()
    render(<QuickEditPanel />)

    const select = screen.getByLabelText(/main text vertical alignment for all slides/i)
    await user.selectOptions(select, 'center')

    const updated = useAppStore.getState().song!
    expect(updated.slides.length).toBeGreaterThanOrEqual(2)
    for (const slide of updated.slides) {
      expect(slide.mainText.verticalAlignment).toBe('center')
    }
  })

  it('does not render the translation row when no slide has translation text', () => {
    importTwoSlides()
    render(<QuickEditPanel />)
    expect(screen.queryByLabelText(/translation text vertical alignment for all slides/i)).not.toBeInTheDocument()
  })

  it('selecting an alignment in the translation row only updates slides that already have translation text', async () => {
    const song = importTwoSlides()
    const [firstSlide, secondSlide] = song.slides
    // Give only the first slide a translation; the second stays untranslated.
    useAppStore.getState().updateSlideText(firstSlide.id, 'translation', 'traducido')

    const user = userEvent.setup()
    render(<QuickEditPanel />)

    const select = screen.getByLabelText(/translation text vertical alignment for all slides/i)
    await user.selectOptions(select, 'top')

    const updated = useAppStore.getState().song!
    const updatedFirst = updated.slides.find((s) => s.id === firstSlide.id)!
    const updatedSecond = updated.slides.find((s) => s.id === secondSlide.id)!

    expect(updatedFirst.translationText).not.toBeNull()
    expect(updatedFirst.translationText!.verticalAlignment).toBe('top')
    expect(updatedSecond.translationText).toBeNull()
  })

  it('re-selecting the same alignment option twice in a row re-applies it (uncontrolled trigger, not a bound value)', async () => {
    importTwoSlides()
    useAppStore.getState().updateAllSlidesVerticalAlignment('main', 'bottom')
    const user = userEvent.setup()
    render(<QuickEditPanel />)

    const select = () => screen.getByLabelText(/main text vertical alignment for all slides/i)
    await user.selectOptions(select(), 'top')
    expect(useAppStore.getState().song!.slides.every((s) => s.mainText.verticalAlignment === 'top')).toBe(true)

    // Manually flip everything back to bottom outside the component, then
    // re-pick "top" again via the (remounted) select to prove the second pick
    // still fires even though it's nominally "the same" choice as before.
    useAppStore.getState().updateAllSlidesVerticalAlignment('main', 'bottom')
    await user.selectOptions(select(), 'top')

    expect(useAppStore.getState().song!.slides.every((s) => s.mainText.verticalAlignment === 'top')).toBe(true)
  })
})
