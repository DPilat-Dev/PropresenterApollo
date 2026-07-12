import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from '../../state/store'
import { SlidePreviewCanvas } from './SlidePreviewCanvas'

beforeEach(() => {
  useAppStore.setState({ song: null, selectedSlideId: null })
})

describe('SlidePreviewCanvas', () => {
  it('shows an empty dark box when there is no song', () => {
    render(<SlidePreviewCanvas />)
    expect(screen.getByText(/no slides yet/i)).toBeInTheDocument()
    expect(screen.queryByTestId('slide-preview-canvas')).not.toBeInTheDocument()
  })

  it('shows an empty dark box when the song has no slides', () => {
    useAppStore.getState().newSong('Empty')
    render(<SlidePreviewCanvas />)
    expect(screen.getByText(/no slides yet/i)).toBeInTheDocument()
  })

  it('falls back to the first slide in group order when none is selected', () => {
    useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4', 2)
    render(<SlidePreviewCanvas />)

    expect(screen.getByTestId('slide-preview-main-text')).toHaveTextContent('line1 line2')
  })

  it('renders the selected slide when one is selected', () => {
    useAppStore.getState().importLyrics('line1\nline2\n\nline3\nline4', 2)
    const song = useAppStore.getState().song!
    useAppStore.getState().selectSlide(song.groups[0].slideIds[1])

    render(<SlidePreviewCanvas />)

    expect(screen.getByTestId('slide-preview-main-text')).toHaveTextContent('line3 line4')
  })

  it('does not render a translation element when translationText is null', () => {
    useAppStore.getState().importLyrics('line1\nline2', 2)
    render(<SlidePreviewCanvas />)

    expect(screen.queryByTestId('slide-preview-translation-text')).not.toBeInTheDocument()
  })

  it('renders the caption noting the preview is an approximation', () => {
    useAppStore.getState().importLyrics('line1\nline2', 2)
    render(<SlidePreviewCanvas />)

    expect(screen.getByText(/preview is an approximation/i)).toBeInTheDocument()
  })

  it('applies the slide backgroundColor as an rgba() background', () => {
    useAppStore.getState().importLyrics('line1\nline2', 2)
    render(<SlidePreviewCanvas />)

    const canvas = screen.getByTestId('slide-preview-canvas')
    expect(canvas).toHaveStyle({ background: 'rgba(0, 0, 0, 1)' })
  })
})
