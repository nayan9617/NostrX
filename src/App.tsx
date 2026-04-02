import { useEffect, useMemo, useRef, useState } from 'react'
import { useRelayFeed } from './hooks/useRelayFeed'

function formatUnixTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

function App() {
  const { events, relayStatuses, isWarmFromCache } = useRelayFeed()
  const [visibleCount, setVisibleCount] = useState(20)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const visibleEvents = useMemo(
    () => events.slice(0, visibleCount),
    [events, visibleCount],
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry.isIntersecting) {
          return
        }

        setVisibleCount((current) => Math.min(current + 20, events.length))
      },
      {
        rootMargin: '160px',
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [events.length])

  useEffect(() => {
    setVisibleCount((current) => Math.max(20, Math.min(current, events.length || 20)))
  }, [events.length])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slateNight via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ember">
            NostrX
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Decentralized Nostr Client
          </h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Real-time events, relay orchestration, local caching, and secure
            publishing built with React, TypeScript, Tailwind, and IndexedDB.
          </p>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
          <article className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-medium">Relay Health</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {relayStatuses.map((relay) => (
                <li
                  key={relay.url}
                  className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{relay.url}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        relay.connected
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-rose-900/60 text-rose-300'
                      }`}
                    >
                      {relay.connected ? 'connected' : 'offline'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Priority {relay.priority} • Retries {relay.retryCount}
                  </p>
                  {relay.lastError ? (
                    <p className="mt-1 text-xs text-rose-300">{relay.lastError}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-medium">Live Event Stream</h2>
            <p className="mt-2 text-sm text-slate-300">
              Listening to kind 1 events across multiple relays.
            </p>
            {isWarmFromCache ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
                Warm started from IndexedDB cache
              </p>
            ) : null}
            <div className="mt-4 max-h-[30rem] space-y-3 overflow-auto pr-1">
              {events.length === 0 ? (
                <p className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3 text-sm text-slate-400">
                  Waiting for incoming relay events...
                </p>
              ) : (
                visibleEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-3"
                  >
                    <p className="text-xs text-slate-400">{formatUnixTimestamp(event.created_at)}</p>
                    <p className="mt-2 max-h-28 overflow-hidden whitespace-pre-wrap break-words text-sm text-slate-200">
                      {event.content || '(no content)'}
                    </p>
                    <p className="mt-2 truncate text-xs text-slate-500">{event.id}</p>
                  </article>
                ))
              )}
              {events.length > visibleEvents.length ? (
                <div
                  ref={sentinelRef}
                  className="rounded-lg border border-dashed border-slate-700/60 bg-slate-950/30 px-3 py-2 text-center text-xs uppercase tracking-[0.12em] text-slate-400"
                >
                  Scroll to load more ({visibleEvents.length}/{events.length})
                </div>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}

export default App
