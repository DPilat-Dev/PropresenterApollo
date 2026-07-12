import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Song } from '../types/song'

export const DB_NAME = 'lyrics-pro6-app'
export const DB_VERSION = 1
export const SONGS_STORE = 'songs'

export interface AppDb extends DBSchema {
  songs: {
    key: string
    value: Song
  }
}

let dbPromise: Promise<IDBPDatabase<AppDb>> | undefined

/**
 * Opens (or returns the cached, already-open) connection to the app's
 * IndexedDB database. Safe to call repeatedly - the underlying `openDB`
 * call only happens once per module lifetime.
 */
export function getDb(): Promise<IDBPDatabase<AppDb>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SONGS_STORE)) {
          db.createObjectStore(SONGS_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}
