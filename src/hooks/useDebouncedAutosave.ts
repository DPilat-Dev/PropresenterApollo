import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../state/store'
import { saveSong, StorageError } from '../storage/songRepository'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutosaveState {
  status: AutosaveStatus
  errorMessage?: string
}

const DEFAULT_DEBOUNCE_MS = 1500

/**
 * Debounced autosave: subscribes to the current song in the store and,
 * `debounceMs` after the last change settles, persists it via `saveSong`.
 * Exposes a small status so the UI can show a "Saved" / "Save failed"
 * indicator. Uses a ref-based setTimeout debounce so no extra dependency is
 * required.
 */
export function useDebouncedAutosave(debounceMs: number = DEFAULT_DEBOUNCE_MS): AutosaveState {
  const song = useAppStore((s) => s.song)
  const [state, setState] = useState<AutosaveState>({ status: 'idle' })

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Guards against a stale async saveSong() resolving/rejecting after a newer
  // save has already started (or the component unmounted) and clobbering status.
  const generationRef = useRef(0)

  useEffect(() => {
    if (song === null) {
      return undefined
    }

    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current)
    }

    const currentGeneration = ++generationRef.current

    timeoutRef.current = setTimeout(() => {
      setState({ status: 'saving' })
      saveSong(song)
        .then(() => {
          if (generationRef.current !== currentGeneration) return
          setState({ status: 'saved' })
        })
        .catch((err: unknown) => {
          if (generationRef.current !== currentGeneration) return
          const message = err instanceof StorageError ? err.message : 'Failed to save song.'
          setState({ status: 'error', errorMessage: message })
        })
    }, debounceMs)

    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [song, debounceMs])

  return state
}
