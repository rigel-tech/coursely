// The session tokens are the whole session: there is no record to check them against,
// so everything a caller is allowed to believe about a token has to come from this
// module. The domain-separation tests are the load-bearing ones — an access token that
// verified as a refresh token would turn a 15-minute credential into a 30-day one.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { createHash, createHmac } from 'node:crypto'

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/lib/auth/session-token'
import { ACCESS_TTL_SEC, REMEMBER_ME_MAX_AGE_SEC } from '@/lib/constants/auth'

const SECRET = process.env.PAYLOAD_SECRET ?? ''

/** Re-derive each key independently, so the assertions do not trust the module. */
const keyFor = (kind: 'access' | 'refresh') =>
  createHash('sha256').update(`coursely/${kind}-token\0${SECRET}`).digest()

const decode = (token: string) => {
  const [header, payload, signature] = token.split('.')
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    claims: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >,
    signature,
    signingInput: `${header}.${payload}`,
  }
}

/** Sign a JWT the way Payload does — the raw secret as the key, not a derived one. */
const signLikePayload = (claims: Record<string, unknown>) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signature = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

afterEach(() => vi.useRealTimers())

describe('signAccessToken', () => {
  it('emits an HS256 JWT signed under the access key', () => {
    const { header, signature, signingInput } = decode(
      signAccessToken({ id: 42, status: 'ACTIVE' }),
    )

    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(createHmac('sha256', keyFor('access')).update(signingInput).digest('base64url')).toBe(
      signature,
    )
  })

  it('carries sub and status, and expires ACCESS_TTL_SEC after it was signed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)

    const { claims } = decode(signAccessToken({ id: 7, status: 'ACTIVE' }))

    expect(claims).toMatchObject({ sub: 7, status: 'ACTIVE', iat: nowSec })
    expect(claims.exp).toBe(nowSec + ACCESS_TTL_SEC)
  })

  it('omits status entirely when it is undefined, rather than emitting null', () => {
    const { claims } = decode(signAccessToken({ id: 1 }))

    expect('status' in claims).toBe(false)
    expect(claims.sub).toBe(1)
  })
})

describe('signRefreshToken', () => {
  it('expires after the lifetime it is given, not a fixed one', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)

    const { claims } = decode(
      signRefreshToken({ id: 3, status: 'ACTIVE' }, REMEMBER_ME_MAX_AGE_SEC),
    )

    expect(claims.exp).toBe(nowSec + REMEMBER_ME_MAX_AGE_SEC)
  })
})

describe('round trips', () => {
  it('reads back the claims it was given', () => {
    expect(verifyAccessToken(signAccessToken({ id: 99, status: 'ACTIVE' }))).toEqual({
      id: 99,
      status: 'ACTIVE',
    })
    expect(verifyRefreshToken(signRefreshToken({ id: 99, status: 'ACTIVE' }, 60))).toEqual({
      id: 99,
      status: 'ACTIVE',
    })
  })

  it('reports an absent status as undefined rather than inventing one', () => {
    expect(verifyAccessToken(signAccessToken({ id: 5 }))).toEqual({ id: 5, status: undefined })
  })
})

describe('domain separation', () => {
  it('refuses an access token at the refresh door and vice versa', () => {
    expect(verifyRefreshToken(signAccessToken({ id: 1, status: 'ACTIVE' }))).toBeNull()
    expect(verifyAccessToken(signRefreshToken({ id: 1, status: 'ACTIVE' }, 60))).toBeNull()
  })

  it('refuses a token signed with the raw Payload key at either door', () => {
    const token = signLikePayload({ sub: 1, exp: Math.floor(Date.now() / 1000) + 3600 })

    expect(verifyAccessToken(token)).toBeNull()
    expect(verifyRefreshToken(token)).toBeNull()
  })
})

describe('rejection', () => {
  it('refuses an expired token of either kind', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'))
    const access = signAccessToken({ id: 1, status: 'ACTIVE' })
    const refresh = signRefreshToken({ id: 1, status: 'ACTIVE' }, 3600)

    vi.setSystemTime(new Date('2026-09-10T11:30:00Z'))

    expect(verifyAccessToken(access)).toBeNull()
    expect(verifyRefreshToken(refresh)).toBeNull()
  })

  it('refuses a token whose header, payload or signature was altered', () => {
    const [header, payload, signature] = signRefreshToken({ id: 1, status: 'ACTIVE' }, 3600).split(
      '.',
    )
    const forged = Buffer.from(JSON.stringify({ sub: 2, status: 'ACTIVE' })).toString('base64url')

    expect(verifyRefreshToken(`x${header}.${payload}.${signature}`)).toBeNull()
    expect(verifyRefreshToken(`${header}.${forged}.${signature}`)).toBeNull()
    expect(verifyRefreshToken(`${header}.${payload}.${signature}x`)).toBeNull()
  })

  it('refuses an absent cookie and anything that is not a JWT', () => {
    for (const bad of [undefined, '', 'not.a.jwt', 'only-one-part']) {
      expect(verifyAccessToken(bad)).toBeNull()
      expect(verifyRefreshToken(bad)).toBeNull()
    }
  })
})
