import { describe, expect, it } from 'vitest'
import { createSignedTextNote, normalizePrivateKey } from './nostrSigner'

describe('nostrSigner', () => {
  const sampleHexKey =
    '1111111111111111111111111111111111111111111111111111111111111111'

  it('normalizes a hex private key', () => {
    const keyBytes = normalizePrivateKey(sampleHexKey)

    expect(keyBytes).toBeInstanceOf(Uint8Array)
    expect(keyBytes).toHaveLength(32)
  })

  it('creates a signed text note event', () => {
    const event = createSignedTextNote(sampleHexKey, 'hello nostr')

    expect(event.kind).toBe(1)
    expect(event.content).toBe('hello nostr')
    expect(event.id).toMatch(/^[0-9a-f]{64}$/)
    expect(event.sig).toMatch(/^[0-9a-f]{128}$/)
    expect(event.pubkey).toMatch(/^[0-9a-f]{64}$/)
  })

  it('throws for malformed private keys', () => {
    expect(() => normalizePrivateKey('not-a-key')).toThrow()
  })
})
