import { useEffect, useMemo, useRef, useState } from 'react'
import { cacheEvents, loadRecentCachedEvents } from '../lib/eventStore'
import { createSignedTextNote } from '../lib/nostrSigner'
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
  const pendingEventsRef = useRef<NostrEvent[]>([])
  const flushTimerRef = useRef<number | null>(null)
  const managerRef = useRef<RelayManager | null>(null)

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
        pendingEventsRef.current.push(incomingEvent)

        if (flushTimerRef.current !== null) {
          return
        }

        flushTimerRef.current = window.setTimeout(() => {
          const buffered = pendingEventsRef.current.splice(0)
          flushTimerRef.current = null

          if (buffered.length === 0) {
            return
          }

          setEvents((currentEvents) => {
            const next = [...buffered, ...currentEvents]
              .sort((a, b) => b.created_at - a.created_at)
              .slice(0, FEED_LIMIT)
            return next
          })

          void cacheEvents(buffered)
        }, 250)
      },
    })

    managerRef.current = manager

    manager.connectAll()
    return () => {
      isMounted = false
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current)
      }
      manager.disconnectAll()
      managerRef.current = null
    }
  }, [filters])

  const publishTextNote = async (
    privateKeyInput: string,
    content: string,
  ): Promise<{ ok: boolean; message: string }> => {
    const manager = managerRef.current
    if (!manager) {
      return { ok: false, message: 'Relay manager is not ready yet' }
    }

    const trimmed = content.trim()
    if (!trimmed) {
      return { ok: false, message: 'Write something before publishing' }
    }

    try {
      const signedEvent = createSignedTextNote(privateKeyInput, trimmed)
      const sentCount = manager.publish(signedEvent)

      seenEventIdsRef.current.add(signedEvent.id)
      setEvents((currentEvents) =>
        [signedEvent, ...currentEvents]
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, FEED_LIMIT),
      )
      void cacheEvents([signedEvent])

      if (sentCount === 0) {
        return {
          ok: false,
          message: 'Signed event created, but no relay connection is currently open',
        }
      }

      return {
        ok: true,
        message: `Signed and sent to ${sentCount} relay${sentCount > 1 ? 's' : ''}`,
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unable to sign event',
      }
    }
  }

  return {
    events,
    isWarmFromCache,
    publishTextNote,
    relayStatuses,
  }
}