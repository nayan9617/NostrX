export type RelayConfig = {
  url: string
  priority: number
  maxRetries: number
}

export type RelayStatus = {
  url: string
  priority: number
  connected: boolean
  lastError: string | null
  retryCount: number
  lastConnectedAt: number | null
}

export type NostrEvent = {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export type NostrFilter = {
  kinds?: number[]
  authors?: string[]
  since?: number
  until?: number
  limit?: number
}