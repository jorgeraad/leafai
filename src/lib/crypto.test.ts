import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes } from 'crypto'

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('hex')
})

describe('crypto', () => {
  it('encrypt returns a base64 string and decrypt recovers the original', async () => {
    const { encrypt, decrypt } = await import('./crypto')
    const plaintext = 'my-secret-refresh-token'
    const ciphertext = encrypt(plaintext)

    expect(typeof ciphertext).toBe('string')
    // Verify it's valid base64
    expect(() => Buffer.from(ciphertext, 'base64')).not.toThrow()

    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertext for the same plaintext (unique IV)', async () => {
    const { encrypt } = await import('./crypto')
    const plaintext = 'same-input'
    const a = encrypt(plaintext)
    const b = encrypt(plaintext)
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('./crypto')
    const ciphertext = encrypt('test')
    const buf = Buffer.from(ciphertext, 'base64')
    buf[buf.length - 1] ^= 0xff // flip last byte
    const tampered = buf.toString('base64')
    expect(() => decrypt(tampered)).toThrow()
  })
})
