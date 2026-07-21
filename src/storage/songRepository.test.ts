import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Slide, Song } from '../types/song'
import { DEFAULT_FILL_COLOR } from '../types/song'

function makeFixtureSlide(overrides?: Partial<Slide>): Slide {
  return {
    id: `slide-${Math.random().toString(36).slice(2)}`,
    label: 'Verse 1',
    notes: '',
    enabled: true,
    backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
    mainText: {
      id: 'main-1',
      role: 'main',
      plainText: 'Amazing grace',
      position: { x: 0, y: 0, z: 0, width: 100, height: 100 },
      style: { fontFamily: 'Arial', fontSizePt: 60, lineSpacingPct: 100, color: { r: 1, g: 1, b: 1, a: 1 } },
      fillColor: { ...DEFAULT_FILL_COLOR },
      verticalAlignment: 'center',
      opacity: 1,
      rotation: 0,
    },
    translationText: null,
    order: 0,
    ...overrides,
  }
}

function makeFixtureSong(overrides?: Partial<Song>): Song {
  const now = new Date().toISOString()
  return {
    id: `song-${Math.random().toString(36).slice(2)}`,
    title: 'Amazing Grace',
    rawLyrics: 'Amazing grace, how sweet the sound',
    splitSettings: { linesPerSlide: 2, skipBlankLines: true },
    slides: [],
    groups: [],
    targetLanguage: null,
    artist: '',
    sourceLanguage: 'en',
    layout: 'original-translation',
    thirdLanguageColor: { r: 0.556863, g: 0.803922, b: 0.901961, a: 1 },
    published: false,
    autoFitBox: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Each test gets a fully isolated IndexedDB world: a fresh in-memory
// fake-indexeddb factory installed as the global `indexedDB`, plus a fresh
// import of the db/repository modules (via vi.resetModules() + dynamic
// import) so db.ts's module-level cached connection promise doesn't leak
// a stale, already-open connection across tests.
let repo!: typeof import('./songRepository')
let dbModule!: typeof import('./db')

beforeEach(async () => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.resetModules()
  repo = await import('./songRepository')
  dbModule = await import('./db')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('songRepository', () => {
  it('saves a song and loads it back by id', async () => {
    const song = makeFixtureSong({ title: 'My Song', slides: [makeFixtureSlide(), makeFixtureSlide()] })
    await repo.saveSong(song)

    const loaded = await repo.loadSong(song.id)

    expect(loaded).toBeDefined()
    expect(loaded?.id).toBe(song.id)
    expect(loaded?.title).toBe('My Song')
    expect(loaded?.slides).toHaveLength(2)
  })

  it('updates updatedAt to a new timestamp on save', async () => {
    const oldTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    const song = makeFixtureSong({ updatedAt: oldTimestamp })

    await repo.saveSong(song)
    const loaded = await repo.loadSong(song.id)

    expect(loaded).toBeDefined()
    expect(loaded!.updatedAt).not.toBe(oldTimestamp)
    // Should be a valid, parseable ISO timestamp very close to now.
    const updatedAtMs = new Date(loaded!.updatedAt).getTime()
    expect(Number.isNaN(updatedAtMs)).toBe(false)
    expect(Date.now() - updatedAtMs).toBeLessThan(5000)
  })

  it('does not mutate the caller-supplied song object', async () => {
    const oldTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    const song = makeFixtureSong({ updatedAt: oldTimestamp })

    await repo.saveSong(song)

    expect(song.updatedAt).toBe(oldTimestamp)
  })

  it('overwrites an existing record when saving with a duplicate id, instead of duplicating it', async () => {
    const id = 'duplicate-id-song'
    await repo.saveSong(makeFixtureSong({ id, title: 'First Title' }))
    await repo.saveSong(makeFixtureSong({ id, title: 'Second Title' }))

    const all = await repo.listSongs()
    const matches = all.filter((s) => s.id === id)

    expect(matches).toHaveLength(1)
    expect(matches[0].title).toBe('Second Title')
  })

  it('lists multiple saved songs sorted by updatedAt descending', async () => {
    const songA = makeFixtureSong({ id: 'song-a', title: 'A' })
    const songB = makeFixtureSong({ id: 'song-b', title: 'B' })
    const songC = makeFixtureSong({ id: 'song-c', title: 'C' })

    // saveSong always stamps updatedAt with "now", so we control relative
    // ordering by saving sequentially with small delays in between rather
    // than relying on the fixture's own updatedAt value.
    await repo.saveSong(songA)
    await new Promise((r) => setTimeout(r, 5))
    await repo.saveSong(songC)
    await new Promise((r) => setTimeout(r, 5))
    await repo.saveSong(songB)

    const all = await repo.listSongs()

    expect(all.map((s) => s.id)).toEqual(['song-b', 'song-c', 'song-a'])
  })

  it('deletes a song so loadSong returns undefined and listSongs excludes it', async () => {
    const song = makeFixtureSong({ id: 'to-delete' })
    const other = makeFixtureSong({ id: 'to-keep' })
    await repo.saveSong(song)
    await repo.saveSong(other)

    await repo.deleteSong(song.id)

    expect(await repo.loadSong(song.id)).toBeUndefined()
    const all = await repo.listSongs()
    expect(all.map((s) => s.id)).not.toContain('to-delete')
    expect(all.map((s) => s.id)).toContain('to-keep')
  })

  it('returns undefined from loadSong for a nonexistent id, not an error', async () => {
    await expect(repo.loadSong('does-not-exist')).resolves.toBeUndefined()
  })

  it('filters out corrupted records (e.g. missing slides) without crashing listSongs', async () => {
    const good = makeFixtureSong({ id: 'good-song', title: 'Good Song' })
    await repo.saveSong(good)

    // Bypass saveSong's validation entirely by writing a malformed record
    // directly via the raw idb handle, as instructed by the task.
    const db = await dbModule.getDb()
    // @ts-expect-error - intentionally malformed: missing `slides` and other required fields
    await db.put('songs', { id: 'corrupted-song', title: 'Corrupted' })

    const all = await repo.listSongs()

    expect(all.map((s) => s.id)).toEqual(['good-song'])
    expect(all.map((s) => s.id)).not.toContain('corrupted-song')

    // loadSong should likewise treat the corrupted record as absent rather than throw.
    await expect(repo.loadSong('corrupted-song')).resolves.toBeUndefined()
  })

  it('backfills fillColor on mainText/translationText for pre-migration records missing it', async () => {
    // Simulate a song saved before `fillColor` existed on TextElementState by
    // writing a record directly via the raw idb handle (bypassing saveSong,
    // which would always include fillColor via the current construction path).
    const preMigrationMainText = {
      id: 'main-legacy',
      role: 'main',
      plainText: 'Legacy main text',
      position: { x: 0, y: 0, z: 0, width: 100, height: 100 },
      style: { fontFamily: 'Arial', fontSizePt: 60, lineSpacingPct: 100, color: { r: 1, g: 1, b: 1, a: 1 } },
      verticalAlignment: 'center',
      opacity: 1,
      rotation: 0,
      // fillColor intentionally omitted
    }
    const preMigrationTranslationText = {
      ...preMigrationMainText,
      id: 'translation-legacy',
      role: 'translation',
      plainText: 'Legacy translation text',
      // fillColor intentionally omitted
    }
    const preMigrationSong = {
      id: 'pre-migration-song',
      title: 'Legacy Song',
      rawLyrics: 'legacy lyrics',
      splitSettings: { linesPerSlide: 2, skipBlankLines: true },
      slides: [
        {
          id: 'legacy-slide',
          label: 'Verse 1',
          notes: '',
          enabled: true,
          backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
          mainText: preMigrationMainText,
          translationText: preMigrationTranslationText,
          order: 0,
        },
      ],
      groups: [],
      targetLanguage: null,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    }

    const db = await dbModule.getDb()
    // @ts-expect-error - intentionally missing fillColor to simulate a pre-migration record
    await db.put('songs', preMigrationSong)

    const loaded = await repo.loadSong('pre-migration-song')
    expect(loaded).toBeDefined()
    expect(loaded!.slides[0].mainText.fillColor).toEqual(DEFAULT_FILL_COLOR)
    expect(loaded!.slides[0].translationText!.fillColor).toEqual(DEFAULT_FILL_COLOR)
    // Song-level fields added in the design refresh are backfilled too.
    expect(loaded!.artist).toBe('')
    expect(loaded!.sourceLanguage).toBe('en')
    expect(loaded!.layout).toBe('original-translation')
    expect(loaded!.published).toBe(false)
    expect(loaded!.thirdLanguageColor).toBeDefined()

    const all = await repo.listSongs()
    const listed = all.find((s) => s.id === 'pre-migration-song')
    expect(listed).toBeDefined()
    expect(listed!.slides[0].mainText.fillColor).toEqual(DEFAULT_FILL_COLOR)
    expect(listed!.slides[0].translationText!.fillColor).toEqual(DEFAULT_FILL_COLOR)
  })

  it('wraps underlying idb failures in StorageError instead of leaking the raw error', async () => {
    // This exercises the try/catch-and-rethrow-as-StorageError wrapping in
    // saveSong: fake-indexeddb doesn't naturally simulate quota-exceeded
    // errors, so we monkey-patch the underlying db.put to reject and assert
    // the repository translates that into a StorageError rather than letting
    // the raw error leak to the caller.
    const db = await dbModule.getDb()
    const putSpy = vi.spyOn(db, 'put').mockRejectedValueOnce(new Error('simulated quota exceeded'))

    const song = makeFixtureSong()

    await expect(repo.saveSong(song)).rejects.toBeInstanceOf(repo.StorageError)

    putSpy.mockRestore()
    await expect(repo.saveSong(song)).resolves.toBeUndefined()
  })
})
