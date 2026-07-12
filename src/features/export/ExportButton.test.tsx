import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../state/store'
import { ExportButton } from './ExportButton'

beforeEach(() => {
  useAppStore.setState({ song: null })
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ExportButton', () => {
  it('is disabled when there is no song', () => {
    render(<ExportButton />)
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled()
  })

  it('is disabled when the song has no slides', () => {
    useAppStore.getState().newSong('Empty Song')
    render(<ExportButton />)
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled()
  })

  it('is enabled and triggers a download when the song has slides', async () => {
    useAppStore.getState().importLyrics('hello\nworld', 2)
    const user = userEvent.setup()
    render(<ExportButton />)

    const button = screen.getByRole('button', { name: /export/i })
    expect(button).toBeEnabled()

    await user.click(button)

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })
})
