import { useEffect, useMemo, useState } from 'react'
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
    const manager = new RelayManager(DEFAULT_RELAYS, filters, {
      onStatusChange: setRelayStatuses,
      onEvent: (incomingEvent) => {
        setEvents((currentEvents) => {
          const next = [incomingEvent, ...currentEvents]
          return next.slice(0, FEED_LIMIT)
        })
      },
    })

    manager.connectAll()
    return () => manager.disconnectAll()
  }, [filters])

  return {
    events,
    relayStatuses,
  }
}