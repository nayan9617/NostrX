# NostrX

NostrX is a decentralized Nostr client focused on real-time relay communication, local caching, and resilient feed delivery.

## Highlights

- Multi-relay WebSocket communication with connection priority
- Retry strategy with exponential backoff for relay reliability
- Event deduplication to avoid repeated processing across relays
- IndexedDB cache to warm start feed state
- Live event stream with infinite scroll and batched updates
- Signed publishing flow with broadcast to connected relays

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- nostr-tools
- IndexedDB

## Local Setup

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Type-check and build production bundle
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Architecture

- [src/lib/relayManager.ts](src/lib/relayManager.ts): Relay lifecycle, retry logic, and multi-relay publish fan-out
- [src/hooks/useRelayFeed.ts](src/hooks/useRelayFeed.ts): Feed orchestration, deduplication, batching, and cache hydration
- [src/lib/eventStore.ts](src/lib/eventStore.ts): IndexedDB event persistence and cache reads
- [src/lib/nostrSigner.ts](src/lib/nostrSigner.ts): Key normalization and event signing
- [src/types/nostr.ts](src/types/nostr.ts): Shared Nostr-facing types
- [src/App.tsx](src/App.tsx): Relay dashboard, event feed, and publish composer

## Security Notes

- Private keys are used only in the browser runtime for event signing.
- Do not use production keys for local testing.
- Prefer burner keys while developing.

## Next Improvements

- Add relay success/ack tracking for publish confirmations
- Add profile metadata rendering for event authors
- Add filter controls for relay lists and event kinds
