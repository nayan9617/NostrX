import type { NostrEvent, NostrFilter, RelayConfig, RelayStatus } from '../types/nostr'

type RelayHandlers = {
  onEvent: (event: NostrEvent, relayUrl: string) => void
  onStatusChange: (statuses: RelayStatus[]) => void
}

type RelayRuntime = {
  socket: WebSocket | null
  status: RelayStatus
  timerId: number | null
}

const RETRY_BASE_DELAY_MS = 1500
const RETRY_MAX_DELAY_MS = 20000

export class RelayManager {
  private readonly relayConfigs: RelayConfig[]
  private readonly runtimes = new Map<string, RelayRuntime>()
  private readonly handlers: RelayHandlers
  private readonly subscriptionId: string
  private readonly filters: NostrFilter[]
  private closed = false

  constructor(relays: RelayConfig[], filters: NostrFilter[], handlers: RelayHandlers) {
    this.relayConfigs = [...relays].sort((a, b) => a.priority - b.priority)
    this.handlers = handlers
    this.filters = filters
    this.subscriptionId = `nostrx-${Date.now()}-${Math.random().toString(16).slice(2)}`

    for (const relay of this.relayConfigs) {
      this.runtimes.set(relay.url, {
        socket: null,
        timerId: null,
        status: {
          url: relay.url,
          priority: relay.priority,
          connected: false,
          lastError: null,
          retryCount: 0,
          lastConnectedAt: null,
        },
      })
    }
  }

  public connectAll(): void {
    this.closed = false
    for (const relay of this.relayConfigs) {
      this.connectRelay(relay)
    }
  }

  public disconnectAll(): void {
    this.closed = true
    for (const relay of this.relayConfigs) {
      const runtime = this.runtimes.get(relay.url)
      if (!runtime) {
        continue
      }

      if (runtime.timerId !== null) {
        window.clearTimeout(runtime.timerId)
        runtime.timerId = null
      }

      if (runtime.socket && runtime.socket.readyState === WebSocket.OPEN) {
        runtime.socket.send(JSON.stringify(['CLOSE', this.subscriptionId]))
      }

      runtime.socket?.close()
      runtime.socket = null
      runtime.status.connected = false
    }

    this.emitStatuses()
  }

  public publish(payload: NostrEvent): void {
    const wireMessage = JSON.stringify(['EVENT', payload])
    for (const relay of this.relayConfigs) {
      const runtime = this.runtimes.get(relay.url)
      if (!runtime?.socket || runtime.socket.readyState !== WebSocket.OPEN) {
        continue
      }

      runtime.socket.send(wireMessage)
    }
  }

  private connectRelay(relay: RelayConfig): void {
    if (this.closed) {
      return
    }

    const runtime = this.runtimes.get(relay.url)
    if (!runtime) {
      return
    }

    try {
      const socket = new WebSocket(relay.url)
      runtime.socket = socket

      socket.onopen = () => {
        runtime.status.connected = true
        runtime.status.retryCount = 0
        runtime.status.lastError = null
        runtime.status.lastConnectedAt = Date.now()
        this.emitStatuses()

        const reqMessage = JSON.stringify(['REQ', this.subscriptionId, ...this.filters])
        socket.send(reqMessage)
      }

      socket.onmessage = (event: MessageEvent<string>) => {
        this.handleRelayMessage(relay.url, event.data)
      }

      socket.onerror = () => {
        runtime.status.lastError = 'Relay websocket error'
        this.emitStatuses()
      }

      socket.onclose = () => {
        runtime.status.connected = false
        this.emitStatuses()
        this.scheduleRetry(relay)
      }
    } catch (error) {
      runtime.status.lastError = error instanceof Error ? error.message : 'Unknown relay error'
      this.emitStatuses()
      this.scheduleRetry(relay)
    }
  }

  private handleRelayMessage(relayUrl: string, payload: string): void {
    try {
      const message = JSON.parse(payload)
      if (!Array.isArray(message)) {
        return
      }

      const [messageType, , event] = message
      if (messageType === 'EVENT' && event?.id) {
        this.handlers.onEvent(event as NostrEvent, relayUrl)
      }
    } catch {
      const runtime = this.runtimes.get(relayUrl)
      if (!runtime) {
        return
      }

      runtime.status.lastError = 'Invalid relay payload'
      this.emitStatuses()
    }
  }

  private scheduleRetry(relay: RelayConfig): void {
    if (this.closed) {
      return
    }

    const runtime = this.runtimes.get(relay.url)
    if (!runtime) {
      return
    }

    if (runtime.status.retryCount >= relay.maxRetries) {
      runtime.status.lastError = `Retry limit reached (${relay.maxRetries})`
      this.emitStatuses()
      return
    }

    runtime.status.retryCount += 1
    const delay = Math.min(
      RETRY_BASE_DELAY_MS * 2 ** (runtime.status.retryCount - 1),
      RETRY_MAX_DELAY_MS,
    )

    runtime.timerId = window.setTimeout(() => {
      runtime.timerId = null
      this.connectRelay(relay)
    }, delay)

    this.emitStatuses()
  }

  private emitStatuses(): void {
    const statuses = [...this.runtimes.values()].map((runtime) => runtime.status)
    statuses.sort((a, b) => a.priority - b.priority)
    this.handlers.onStatusChange(statuses)
  }
}