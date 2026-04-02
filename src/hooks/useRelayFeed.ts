import { useEffect, useMemo, useRef, useState } from 'react'
import { cacheEvents, loadRecentCachedEvents } from '../lib/eventStore'
import { RelayManager } from '../lib/relayManager'
import type { NostrEvent, RelayConfig, RelayStatus } from '../types/nostr'

const DEFAULT_RELAYS: RelayConfig[] = [
  { url: 'wss://relay.damus.io', priority: 1, maxRetries: 8 },
  { url: 'wss://nos.lol', priority: 2, maxRetries: 8 },
  { url: 'wss://relay.snort.social', priority: 3, maxRetries: 8 },
]

const FEED_LIMIT = 150

export function useRelayFeed() {
  const [events, setEvents] = useState<NostrEvent[]>([])
  const [relayStatuses, setRelayStatuses] = useState<RelayStatus[]>([])
  const [isWarmFromCache, setIsWarmFromCache] = useState(false)
  const seenEventIdsRef = useRef<Set<string>>(new Set())

  const filters = useMemo(
    () => [
      {
        kinds: [1],
        since: Math.floor(Date.now() / 1000) - 60 * 60,
        limit: 50,
      },
    ],
    [],
  )

  useEffect(() => {
    let isMounted = true

    const hydrateCache = async () => {
      try {
        const cachedEvents = await loadRecentCachedEvents(FEED_LIMIT)
        if (!isMounted || cachedEvents.length === 0) {
          return
        }

        setEvents(cachedEvents)
        for (const event of cachedEvents) {
          seenEventIdsRef.current.add(event.id)
        }
        setIsWarmFromCache(true)
      } catch {
        // Cache hydration is optional for the feed startup path.
      }
    }

    hydrateCache()

    const manager = new RelayManager(DEFAULT_RELAYS, filters, {
      onStatusChange: setRelayStatuses,
      onEvent: (incomingEvent) => {
        if (seenEventIdsRef.current.has(incomingEvent.id)) {
          return
        }

        seenEventIdsRef.current.add(incomingEvent.id)
        setEvents((currentEvents) => {
          const next = [incomingEvent, ...currentEvents]
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, FEED_LIMIT)

          void cacheEvents([incomingEvent])
          return next
        })
      },
    })

    manager.connectAll()
    return () => {
      isMounted = false
      manager.disconnectAll()
    }
  }, [filters])

  return {
    events,
    isWarmFromCache,
    relayStatuses,
  }
}