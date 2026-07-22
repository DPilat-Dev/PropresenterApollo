import { getDb, SONGS_STORE } from './db'
import type { Song, TextElementState } from '../types/song'
import { DEFAULT_FILL_COLOR, DEFAULT_THIRD_LANGUAGE_COLOR } from '../types/song'

/**
 * Thrown whenever persistence to/from IndexedDB fails - e.g. the browser
 * doesn't support IndexedDB, storage quota was exceeded, or the underlying
 * connection/transaction throws. Calling UI code should catch this
 * specifically to show a graceful message instead of an unhandled crash.
 */
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
  }
}

/** Minimal structural check that a record loaded back from the store is a well-formed Song. */
function isValidSong(record: unknown): record is Song {
  if (!record || typeof record !== 'object') return false
  const candidate = record as Partial<Song>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    Array.isArray(candidate.slides) &&
    typeof candidate.updatedAt === 'string'
  )
}

function backfillFillColor(el: TextElementState): TextElementState {
  return el.fillColor ? el : { ...el, fillColor: { ...DEFAULT_FILL_COLOR } }
}

/**
 * Backfills fields that were added after some songs were already persisted -
 * both on `TextElementState` (e.g. `fillColor`) and, since the design refresh,
 * on `Song` itself (`artist`, `sourceLanguage`, `layout`, `thirdLanguageColor`,
 * `published`). Distinct from `isValidSong`, which only checks structural
 * validity - this fills in defaults for records that are valid but predate a
 * schema addition. The `??` guards mean a record already carrying these fields
 * is returned unchanged.
 */
function normalizeSong(song: Song): Song {
  return {
    ...song,
    artist: song.artist ?? '',
    sourceLanguage: song.sourceLanguage ?? 'en',
    translationCache: song.translationCache ?? {},
    layout: song.layout ?? 'original-translation',
    thirdLanguageColor: song.thirdLanguageColor ?? { ...DEFAULT_THIRD_LANGUAGE_COLOR },
    published: song.published ?? false,
    // Old records predate auto-fit; leave their hand-placed boxes untouched.
    autoFitBox: song.autoFitBox ?? false,
    slides: song.slides.map((slide) => ({
      ...slide,
      mainText: backfillFillColor(slide.mainText),
      translationText: slide.translationText === null ? null : backfillFillColor(slide.translationText),
    })),
  }
}

/**
 * Upserts (put) a song into the store, stamping `updatedAt` with the
 * current time. Does not mutate the caller's object.
 */
export async function saveSong(song: Song): Promise<void> {
  const toSave: Song = { ...song, updatedAt: new Date().toISOString() }
  try {
    const db = await getDb()
    await db.put(SONGS_STORE, toSave)
  } catch (err) {
    throw new StorageError(`Failed to save song "${song.id}": ${describeError(err)}`, { cause: err })
  }
}

/** Loads a single song by id. Returns undefined if not found or if the stored record is corrupted. */
export async function loadSong(id: string): Promise<Song | undefined> {
  let record: unknown
  try {
    const db = await getDb()
    record = await db.get(SONGS_STORE, id)
  } catch (err) {
    throw new StorageError(`Failed to load song "${id}": ${describeError(err)}`, { cause: err })
  }

  if (record === undefined) return undefined

  if (!isValidSong(record)) {
    console.warn(`Skipping corrupted song record for id "${id}"`, record)
    return undefined
  }

  return normalizeSong(record)
}

/** Returns all saved songs, sorted by updatedAt descending (most recently updated first). */
export async function listSongs(): Promise<Song[]> {
  let records: unknown[]
  try {
    const db = await getDb()
    records = await db.getAll(SONGS_STORE)
  } catch (err) {
    throw new StorageError(`Failed to list songs: ${describeError(err)}`, { cause: err })
  }

  const validSongs: Song[] = []
  for (const record of records) {
    if (isValidSong(record)) {
      validSongs.push(normalizeSong(record))
    } else {
      console.warn('Skipping corrupted song record encountered while listing songs', record)
    }
  }

  return validSongs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Deletes a song by id. Resolves even if no song with that id exists. */
export async function deleteSong(id: string): Promise<void> {
  try {
    const db = await getDb()
    await db.delete(SONGS_STORE, id)
  } catch (err) {
    throw new StorageError(`Failed to delete song "${id}": ${describeError(err)}`, { cause: err })
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
