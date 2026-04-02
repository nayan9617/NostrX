import { finalizeEvent, getPublicKey, nip19 } from 'nostr-tools'
import type { NostrEvent } from '../types/nostr'

function isHexString(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value)
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase()
  const bytes = new Uint8Array(normalized.length / 2)

  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16)
  }

  return bytes
}

export function normalizePrivateKey(input: string): Uint8Array {
  const trimmed = input.trim()
  if (isHexString(trimmed)) {
    return hexToBytes(trimmed)
  }

  const decoded = nip19.decode(trimmed)
  if (decoded.type !== 'nsec') {
    throw new Error('Expected a hex key or nsec private key')
  }

  if (decoded.data instanceof Uint8Array) {
    return decoded.data
  }

  if (typeof decoded.data === 'string' && isHexString(decoded.data)) {
    return hexToBytes(decoded.data)
  }

  throw new Error('Could not decode private key')
}

export function createSignedTextNote(privateKeyInput: string, content: string): NostrEvent {
  const privateKey = normalizePrivateKey(privateKeyInput)
  const now = Math.floor(Date.now() / 1000)

  const unsignedEvent = {
    kind: 1,
    created_at: now,
    tags: [] as string[][],
    content,
    pubkey: getPublicKey(privateKey),
  }

  return finalizeEvent(unsignedEvent, privateKey) as NostrEvent
}