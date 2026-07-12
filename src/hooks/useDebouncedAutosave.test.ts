import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../state/store'
import { StorageError } from '../storage/songRepository'
import { useDebouncedAutosave } from './useDebouncedAutosave'

const { saveSongMock } = vi.hoisted(() => ({
  saveSongMock: vi.fn(),
}))

vi.mock('../storage/songRepository', async () => {
  const actual = await vi.importActual<typeof import('../storage/songRepository')>('../storage/songRepository')
  return {
    ...actual,
    saveSong: saveSongMock,
  }
})

beforeEach(() => {
  useAppStore.setState({ song: null })
  saveSongMock.mockReset()
  saveSongMock.mockResolvedValue(undefined)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useDebouncedAutosave', () => {
  it('does not call saveSong when there is no song', () => {
    renderHook(() => useDebouncedAutosave())
    vi.advanceTimersByTime(5000)
    expect(saveSongMock).not.toHaveBeenCalled()
  })

  it('does not call saveSong before the debounce delay elapses', () => {
    renderHook(() => useDebouncedAutosave(1500))

    act(() => {
      useAppStore.getState().newSong('Test Song')
    })

    vi.advanceTimersByTime(1000)
    expect(saveSongMock).not.toHaveBeenCalled()
  })

  it('calls saveSong with the current song after the debounce delay elapses', async () => {
    renderHook(() => useDebouncedAutosave(1500))

    act(() => {
      useAppStore.getState().newSong('Test Song')
    })

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(saveSongMock).toHaveBeenCalledTimes(1)
    expect(saveSongMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test Song' }))
  })

  it('resets the debounce timer on rapid successive changes, saving only once', async () => {
    renderHook(() => useDebouncedAutosave(1500))

    act(() => {
      useAppStore.getState().newSong('First')
    })
    vi.advanceTimersByTime(1000)

    act(() => {
      useAppStore.getState().song && useAppStore.getState().setSong({ ...useAppStore.getState().song!, title: 'Second' })
    })
    vi.advanceTimersByTime(1000)
    expect(saveSongMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(saveSongMock).toHaveBeenCalledTimes(1)
    expect(saveSongMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Second' }))
  })

  it('reports a "saved" status after a successful save', async () => {
    const { result } = renderHook(() => useDebouncedAutosave(1500))

    act(() => {
      useAppStore.getState().newSong('Test Song')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(result.current.status).toBe('saved')
  })

  it('reports an "error" status with a message when saveSong throws a StorageError', async () => {
    saveSongMock.mockRejectedValueOnce(new StorageError('disk is full'))
    const { result } = renderHook(() => useDebouncedAutosave(1500))

    act(() => {
      useAppStore.getState().newSong('Test Song')
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toContain('disk is full')
  })
})
