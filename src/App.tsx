function App() {
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

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-medium">Planned Feature Set</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Multi-relay WebSocket communication</li>
              <li>Event deduplication + IndexedDB cache</li>
              <li>Live event feed with infinite scroll</li>
              <li>Event publishing with cryptographic signing</li>
            </ul>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-medium">Status</h2>
            <p className="mt-3 text-sm text-slate-300">
              Foundation complete. The next branches will add networking,
              caching, feed optimization, and publishing.
            </p>
          </article>
        </section>
      </div>
    </main>
  )
}

export default App
