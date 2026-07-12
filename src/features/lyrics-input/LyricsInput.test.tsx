import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '../../state/store'
import { LyricsInput } from './LyricsInput'

beforeEach(() => {
  useAppStore.setState({ song: null })
})

describe('LyricsInput', () => {
  it('renders a labeled textarea, file input, and lines-per-slide input', () => {
    render(<LyricsInput />)

    expect(screen.getByLabelText('Paste lyrics')).toBeInTheDocument()
    expect(screen.getByLabelText('Or load a .txt file')).toBeInTheDocument()
    expect(screen.getByLabelText('Lines per slide')).toBeInTheDocument()
  })

  it('defaults lines per slide to 2', () => {
    render(<LyricsInput />)
    expect(screen.getByLabelText('Lines per slide')).toHaveValue(2)
  })

  it('disables the import button until text is entered', async () => {
    const user = userEvent.setup()
    render(<LyricsInput />)

    const button = screen.getByRole('button', { name: /generate slides/i })
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText('Paste lyrics'), 'line1\nline2')
    expect(button).toBeEnabled()
  })

  it('typing lyrics and clicking import creates the expected number of slides in the store', async () => {
    const user = userEvent.setup()
    render(<LyricsInput />)

    await user.type(screen.getByLabelText('Paste lyrics'), 'line1{Enter}line2{Enter}line3{Enter}line4')

    const linesInput = screen.getByLabelText('Lines per slide')
    await user.clear(linesInput)
    await user.type(linesInput, '2')

    await user.click(screen.getByRole('button', { name: /generate slides/i }))

    const song = useAppStore.getState().song
    expect(song).not.toBeNull()
    expect(song!.slides).toHaveLength(2)
    expect(song!.slides[0].mainText.plainText).toBe('line1\nline2')
    expect(song!.slides[1].mainText.plainText).toBe('line3\nline4')
  })

  it('creates a song implicitly when none exists yet', async () => {
    const user = userEvent.setup()
    render(<LyricsInput />)

    expect(useAppStore.getState().song).toBeNull()

    await user.type(screen.getByLabelText('Paste lyrics'), 'hello world')
    await user.click(screen.getByRole('button', { name: /generate slides/i }))

    expect(useAppStore.getState().song).not.toBeNull()
    expect(useAppStore.getState().song!.title).toBe('Untitled Song')
  })
})
