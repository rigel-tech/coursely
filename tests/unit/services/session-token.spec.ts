import { describe, it, expect, afterEach, vi } from 'vitest'
import { createHash, createHmac } from 'node:crypto'

import { signAccessToken, generateRefreshToken, hashRefreshToken } from '@/services/session-token'
import { ACCESS_TTL_SEC } from '@/lib/constants/auth'

/** Re-derive the module's HS256 key independently so the assertions don't trust it. */
const key = createHash('sha256')
  .update(`coursely/access-token\0${process.env.PAYLOAD_SECRET ?? ''}`)
  .digest()

const decode = (token: string) => {
  const [header, payload, sig] = token.split('.')
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    claims: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >,
    sig,
    signingInput: `${header}.${payload}`,
  }
}

afterEach(() => vi.useRealTimers())

describe('signAccessToken', () => {
  it('emits a well-formed HS256 JWT whose signature verifies under the derived key', () => {
    const token = signAccessToken({ sub: 42, role: 'STUDENT', status: 'ACTIVE' })
    const { header, sig, signingInput } = decode(token)

    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(createHmac('sha256', key).update(signingInput).digest('base64url')).toBe(sig)
  })

  it('carries sub / role / status and sets exp = iat + ACCESS_TTL_SEC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T10:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)

    const { claims } = decode(signAccessToken({ sub: 7, role: 'ADMIN', status: 'ACTIVE' }))

    expect(claims).toMatchObject({ sub: 7, role: 'ADMIN', status: 'ACTIVE', iat: nowSec })
    expect(claims.exp).toBe(nowSec + ACCESS_TTL_SEC)
  })

  it('omits role and status entirely when they are undefined (never emits null)', () => {
    const { claims } = decode(signAccessToken({ sub: 1 }))
    expect('role' in claims).toBe(false)
    expect('status' in claims).toBe(false)
    expect(claims.sub).toBe(1)
  })
})

describe('generateRefreshToken', () => {
  it('returns a 43-char base64url string, distinct every call', () => {
    const a = generateRefreshToken()
    const b = generateRefreshToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/) // 32 bytes → 43 base64url chars, no padding
    expect(a).not.toBe(b)
  })
})

describe('hashRefreshToken', () => {
  it('is a stable 64-hex SHA-256 digest that differs per input', () => {
    expect(hashRefreshToken('abc')).toBe(createHash('sha256').update('abc').digest('hex'))
    expect(hashRefreshToken('abc')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashRefreshToken('abc')).not.toBe(hashRefreshToken('abd'))
  })

  it('never returns the raw token', () => {
    const raw = generateRefreshToken()
    expect(hashRefreshToken(raw)).not.toContain(raw)
  })
})
