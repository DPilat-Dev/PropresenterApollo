import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../state/store'
import { CANVAS_HEIGHT } from '../../types/song'
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
    const originalHeights = song.slides.map((s) => s.mainText.position.height)
    const originalPositions = song.slides.map((s) => ({ ...s.mainText.position }))
    const user = userEvent.setup()
    render(<QuickEditPanel />)

    const select = screen.getByLabelText(/main text vertical alignment for all slides/i)
    await user.selectOptions(select, 'center')

    const updated = useAppStore.getState().song!
    expect(updated.slides.length).toBeGreaterThanOrEqual(2)
    updated.slides.forEach((slide, i) => {
      expect(slide.mainText.verticalAlignment).toBe('center')
      // The whole box moves, not just text-within-box alignment.
      expect(slide.mainText.position.y).toBe((CANVAS_HEIGHT - originalHeights[i]) / 2)
      expect(slide.mainText.position.x).toBe(originalPositions[i].x)
      expect(slide.mainText.position.width).toBe(originalPositions[i].width)
      expect(slide.mainText.position.height).toBe(originalPositions[i].height)
    })
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

  it('does not render the clamp checkbox when no slide has translation text', () => {
    importTwoSlides()
    render(<QuickEditPanel />)
    expect(screen.queryByLabelText(/clamp translation under main text/i)).not.toBeInTheDocument()
  })

  it('renders the clamp checkbox when at least one slide has translation text', () => {
    const song = importTwoSlides()
    useAppStore.getState().updateSlideText(song.slides[0].id, 'translation', 'traducido')
    render(<QuickEditPanel />)
    expect(screen.getByLabelText(/clamp translation under main text/i)).toBeInTheDocument()
  })

  it('with the clamp checkbox unchecked (default), selecting Main alignment only moves mainText', async () => {
    const song = importTwoSlides()
    const [firstSlide, secondSlide] = song.slides
    useAppStore.getState().updateSlideText(firstSlide.id, 'translation', 'traducido')
    const originalTranslationPosition = { ...useAppStore.getState().song!.slides[0].translationText!.position }

    const user = userEvent.setup()
    render(<QuickEditPanel />)

    const select = screen.getByLabelText(/main text vertical alignment for all slides/i)
    await user.selectOptions(select, 'top')

    const updated = useAppStore.getState().song!
    expect(updated.slides.find((s) => s.id === firstSlide.id)!.mainText.verticalAlignment).toBe('top')
    expect(updated.slides.find((s) => s.id === firstSlide.id)!.translationText!.position).toEqual(
      originalTranslationPosition,
    )
    expect(updated.slides.find((s) => s.id === secondSlide.id)!.mainText.verticalAlignment).toBe('top')
  })

  it('with the clamp checkbox checked, selecting a Main alignment moves both mainText and translationText for slides with translation, and only mainText otherwise', async () => {
    const song = importTwoSlides()
    const [firstSlide, secondSlide] = song.slides
    useAppStore.getState().updateSlideText(firstSlide.id, 'translation', 'traducido')
    expect(useAppStore.getState().song!.slides.find((s) => s.id === secondSlide.id)!.translationText).toBeNull()

    const user = userEvent.setup()
    render(<QuickEditPanel />)

    await user.click(screen.getByLabelText(/clamp translation under main text/i))

    // The independent translation row is hidden once clamping is enabled.
    expect(screen.queryByLabelText(/translation text vertical alignment for all slides/i)).not.toBeInTheDocument()

    const select = screen.getByLabelText(/main text vertical alignment for all slides/i)
    await user.selectOptions(select, 'top')

    const updated = useAppStore.getState().song!
    const updatedFirst = updated.slides.find((s) => s.id === firstSlide.id)!
    const updatedSecond = updated.slides.find((s) => s.id === secondSlide.id)!

    expect(updatedFirst.mainText.verticalAlignment).toBe('top')
    expect(updatedFirst.translationText).not.toBeNull()
    expect(updatedFirst.translationText!.verticalAlignment).toBe('top')
    // Translation sits directly beneath main with the expected gap, not overlapping.
    expect(updatedFirst.translationText!.position.y).toBeGreaterThan(
      updatedFirst.mainText.position.y + updatedFirst.mainText.position.height,
    )

    expect(updatedSecond.mainText.verticalAlignment).toBe('top')
    expect(updatedSecond.translationText).toBeNull()
  })

  it('translation select row is not present in the DOM when the clamp checkbox is checked', async () => {
    const song = importTwoSlides()
    useAppStore.getState().updateSlideText(song.slides[0].id, 'translation', 'traducido')

    const user = userEvent.setup()
    render(<QuickEditPanel />)

    expect(screen.getByLabelText(/translation text vertical alignment for all slides/i)).toBeInTheDocument()
    await user.click(screen.getByLabelText(/clamp translation under main text/i))
    expect(screen.queryByLabelText(/translation text vertical alignment for all slides/i)).not.toBeInTheDocument()
  })

  it('re-selecting the same alignment option twice in a row re-applies it (uncontrolled trigger, not a bound value)', async () => {
    importTwoSlides()
    useAppStore.getState().updateAllSlidesPlacement('main', 'bottom')
    const user = userEvent.setup()
    render(<QuickEditPanel />)

    const select = () => screen.getByLabelText(/main text vertical alignment for all slides/i)
    await user.selectOptions(select(), 'top')
    expect(useAppStore.getState().song!.slides.every((s) => s.mainText.verticalAlignment === 'top')).toBe(true)

    // Manually flip everything back to bottom outside the component, then
    // re-pick "top" again via the (remounted) select to prove the second pick
    // still fires even though it's nominally "the same" choice as before.
    useAppStore.getState().updateAllSlidesPlacement('main', 'bottom')
    await user.selectOptions(select(), 'top')

    expect(useAppStore.getState().song!.slides.every((s) => s.mainText.verticalAlignment === 'top')).toBe(true)
  })
})
