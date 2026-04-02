import { describe, expect, it } from 'vitest'
import { cacheEvents, loadRecentCachedEvents } from './eventStore'
import type { NostrEvent } from '../types/nostr'

function makeEvent(idSuffix: string, createdAt: number): NostrEvent {
  return {
    id: `${idSuffix}`.padEnd(64, '0').slice(0, 64),
    pubkey: 'a'.repeat(64),
    created_at: createdAt,
    kind: 1,
    tags: [],
    content: `event-${idSuffix}`,
    sig: 'b'.repeat(128),
  }
}

describe('eventStore', () => {
  it('caches events and reads them back in descending time order', async () => {
    const oldEvent = makeEvent('old', 10)
    const newEvent = makeEvent('new', 20)

    await cacheEvents([oldEvent, newEvent])

    const cached = await loadRecentCachedEvents(10)

    expect(cached.length).toBeGreaterThanOrEqual(2)
    expect(cached[0].id).toBe(newEvent.id)
    expect(cached.find((event) => event.id === oldEvent.id)).toBeTruthy()
  })

  it('honors cache read limit', async () => {
    const eventOne = makeEvent('one', 30)
    const eventTwo = makeEvent('two', 40)
    const eventThree = makeEvent('tri', 50)

    await cacheEvents([eventOne, eventTwo, eventThree])

    const limited = await loadRecentCachedEvents(2)

    expect(limited).toHaveLength(2)
  })
})
