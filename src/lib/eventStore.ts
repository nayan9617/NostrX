import type { NostrEvent } from '../types/nostr'

const DB_NAME = 'nostrx-db'
const STORE_NAME = 'events'
const DB_VERSION = 1

type EventRecord = NostrEvent & {
  cachedAt: number
}

function openEventDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error ?? new Error('Unable to open IndexedDB'))
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('created_at', 'created_at', { unique: false })
        store.createIndex('cachedAt', 'cachedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
  })
}

export async function cacheEvents(events: NostrEvent[]): Promise<void> {
  if (!events.length) {
    return
  }

  const db = await openEventDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    for (const event of events) {
      const record: EventRecord = {
        ...event,
        cachedAt: Date.now(),
      }
      store.put(record)
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Failed caching events'))
  })

  db.close()
}

export async function loadRecentCachedEvents(limit = 80): Promise<NostrEvent[]> {
  const db = await openEventDb()

  const events = await new Promise<NostrEvent[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('created_at')
    const request = index.openCursor(null, 'prev')
    const results: NostrEvent[] = []

    request.onerror = () => reject(request.error ?? new Error('Failed reading event cache'))

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor || results.length >= limit) {
        resolve(results)
        return
      }

      const { cachedAt: _cachedAt, ...event } = cursor.value as EventRecord
      results.push(event)
      cursor.continue()
    }
  })

  db.close()
  return events
}