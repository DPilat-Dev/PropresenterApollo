import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '../../state/store'
import { SlideList } from './SlideList'

beforeEach(() => {
  useAppStore.setState({ song: null, selectedSlideId: null })
})

describe('SlideList', () => {
  it('shows an empty-state message when there is no song', () => {
    render(<SlideList />)
    expect(screen.getByText(/paste lyrics above to get started/i)).toBeInTheDocument()
  })

  it('shows an empty-state message when the song has no slides', () => {
    useAppStore.getState().newSong('Empty Song')
    render(<SlideList />)
    expect(screen.getByText(/paste lyrics above to get started/i)).toBeInTheDocument()
  })

  it('renders one item per slide, matching the store slide count and order', () => {
    useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4\n\nline5\nline6', 2)
    render(<SlideList />)

    const items = screen.getAllByRole('listitem')
    const song = useAppStore.getState().song!
    expect(items).toHaveLength(song.slides.length)
    expect(items[0]).toHaveTextContent('line1')
    expect(items[1]).toHaveTextContent('line3')
    expect(items[2]).toHaveTextContent('line5')
  })

  it('clicking a slide calls selectSlide with that slide id', async () => {
    const user = userEvent.setup()
    useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4', 2)
    render(<SlideList />)

    const song = useAppStore.getState().song!
    const targetId = song.groups[0].slideIds[1]
    const items = screen.getAllByRole('listitem')

    await user.click(items[1])

    expect(useAppStore.getState().selectedSlideId).toBe(targetId)
  })

  it('highlights the selected slide', () => {
    useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4', 2)
    const song = useAppStore.getState().song!
    useAppStore.getState().selectSlide(song.groups[0].slideIds[0])
    render(<SlideList />)

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('aria-current', 'true')
    expect(items[1]).not.toHaveAttribute('aria-current')
  })

  it('delete button removes the slide from the store', async () => {
    const user = userEvent.setup()
    useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4', 2)
    render(<SlideList />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    expect(useAppStore.getState().song!.slides).toHaveLength(1)
  })

  it('split button splits a multi-line slide at the midpoint', async () => {
    const user = userEvent.setup()
    useAppStore.getState().importLyrics('a\nb\nc\nd', 4)
    render(<SlideList />)

    const splitButtons = screen.getAllByRole('button', { name: /split/i })
    await user.click(splitButtons[0])

    const song = useAppStore.getState().song!
    expect(song.slides).toHaveLength(2)
    expect(song.slides[0].mainText.plainText).toBe('a\nb')
    expect(song.slides[1].mainText.plainText).toBe('c\nd')
  })

  it('disables split for single-line slides', () => {
    useAppStore.getState().importLyrics('a\nb', 1)
    render(<SlideList />)

    const splitButtons = screen.getAllByRole('button', { name: /split/i })
    expect(splitButtons[0]).toBeDisabled()
  })

  it('merge selected combines checked slides in list order and clears selection', async () => {
    const user = userEvent.setup()
    useAppStore.getState().importLyrics('a\nb\n\nc\nd\n\ne\nf', 2)
    render(<SlideList />)

    const checkboxes = screen.getAllByRole('checkbox')
    // Check slide 0 and slide 2 (not slide 1) to verify list-order preservation.
    await user.click(checkboxes[2])
    await user.click(checkboxes[0])

    const mergeButton = screen.getByRole('button', { name: /merge selected/i })
    expect(mergeButton).toBeEnabled()
    await user.click(mergeButton)

    const song = useAppStore.getState().song!
    expect(song.slides).toHaveLength(2)
    expect(song.slides[0].mainText.plainText).toBe('a\nb\ne\nf')
  })

  it('merge button is disabled with fewer than 2 selected', () => {
    useAppStore.getState().importLyrics('a\nb\n\nc\nd', 2)
    render(<SlideList />)

    expect(screen.getByRole('button', { name: /merge selected/i })).toBeDisabled()
  })

  it('reorders slides via drag-and-drop', () => {
    useAppStore.getState().importLyrics('a\nb\n\nc\nd\n\ne\nf', 2)
    render(<SlideList />)

    const originalIds = useAppStore.getState().song!.groups[0].slideIds
    const items = screen.getAllByRole('listitem')

    const dataTransfer = { setData: () => {}, getData: () => '' }
    fireEvent.dragStart(items[0], { dataTransfer })
    fireEvent.dragOver(items[2], { dataTransfer })
    fireEvent.drop(items[2], { dataTransfer })

    const newIds = useAppStore.getState().song!.groups[0].slideIds
    expect(newIds).toEqual([originalIds[1], originalIds[2], originalIds[0]])
  })
})
