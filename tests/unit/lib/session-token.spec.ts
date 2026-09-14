// @vitest-environment node
// jose 6 is WebCrypto-only and rejects jsdom's Uint8Array realm, so this spec cannot
// run under the config's default jsdom environment.
//
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
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC } from '@/lib/constants/auth'

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

/**
 * Sign exactly the way this module did before jose: hand-rolled HMAC over the same
 * derived key. Cookies minted by that code are in live browsers right now, so a token
 * shaped like this has to keep verifying.
 */
const signLegacy = (kind: 'access' | 'refresh', claims: Record<string, unknown>) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signature = createHmac('sha256', keyFor(kind))
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

afterEach(() => vi.useRealTimers())

describe('the API is async', () => {
  it('returns promises from all four entry points', () => {
    expect(signAccessToken({ id: 1 })).toBeInstanceOf(Promise)
    expect(signRefreshToken({ id: 1 }, 60)).toBeInstanceOf(Promise)
    expect(verifyAccessToken(undefined)).toBeInstanceOf(Promise)
    expect(verifyRefreshToken(undefined)).toBeInstanceOf(Promise)
  })
})

describe('signAccessToken', () => {
  it('emits an HS256 JWT signed under the access key', async () => {
    const { header, signature, signingInput } = decode(
      await signAccessToken({ id: 42, status: 'ACTIVE' }),
    )

    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(createHmac('sha256', keyFor('access')).update(signingInput).digest('base64url')).toBe(
      signature,
    )
  })

  it('carries sub and status, and expires ACCESS_TTL_SEC after it was signed', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)

    const { claims } = decode(await signAccessToken({ id: 7, status: 'ACTIVE' }))

    expect(claims).toMatchObject({ sub: 7, status: 'ACTIVE', iat: nowSec })
    expect(claims.exp).toBe(nowSec + ACCESS_TTL_SEC)
  })

  it('omits status entirely when it is undefined, rather than emitting null', async () => {
    const { claims } = decode(await signAccessToken({ id: 1 }))

    expect('status' in claims).toBe(false)
    expect(claims.sub).toBe(1)
  })
})

describe('signRefreshToken', () => {
  it('expires after the lifetime it is given, not a fixed one', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'))
    const nowSec = Math.floor(Date.now() / 1000)

    const { claims } = decode(await signRefreshToken({ id: 3, status: 'ACTIVE' }, REFRESH_TTL_SEC))

    expect(claims.exp).toBe(nowSec + REFRESH_TTL_SEC)
  })
})

describe('round trips', () => {
  it('reads back the claims it was given', async () => {
    expect(await verifyAccessToken(await signAccessToken({ id: 99, status: 'ACTIVE' }))).toEqual({
      id: 99,
      status: 'ACTIVE',
    })
    expect(
      await verifyRefreshToken(await signRefreshToken({ id: 99, status: 'ACTIVE' }, 60)),
    ).toEqual({ id: 99, status: 'ACTIVE' })
  })

  it('reports an absent status as undefined rather than inventing one', async () => {
    expect(await verifyAccessToken(await signAccessToken({ id: 5 }))).toEqual({
      id: 5,
      status: undefined,
    })
  })
})

describe('tokens minted before jose', () => {
  it('still verify, so nobody is signed out by the switch', async () => {
    const iat = Math.floor(Date.now() / 1000)

    expect(
      await verifyAccessToken(
        signLegacy('access', { sub: 8, status: 'ACTIVE', iat, exp: iat + ACCESS_TTL_SEC }),
      ),
    ).toEqual({ id: 8, status: 'ACTIVE' })
    expect(
      await verifyRefreshToken(signLegacy('refresh', { sub: 8, iat, exp: iat + 3600 })),
    ).toEqual({ id: 8, status: undefined })
  })

  it('are byte-for-byte what this module now emits for the same claims', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'))
    const iat = Math.floor(Date.now() / 1000)

    expect(await signAccessToken({ id: 8, status: 'ACTIVE' })).toBe(
      signLegacy('access', { sub: 8, iat, exp: iat + ACCESS_TTL_SEC, status: 'ACTIVE' }),
    )
  })
})

describe('domain separation', () => {
  it('refuses an access token at the refresh door and vice versa', async () => {
    expect(await verifyRefreshToken(await signAccessToken({ id: 1, status: 'ACTIVE' }))).toBeNull()
    expect(
      await verifyAccessToken(await signRefreshToken({ id: 1, status: 'ACTIVE' }, 60)),
    ).toBeNull()
  })

  it('refuses a token signed with the raw Payload key at either door', async () => {
    const token = signLikePayload({ sub: 1, exp: Math.floor(Date.now() / 1000) + 3600 })

    expect(await verifyAccessToken(token)).toBeNull()
    expect(await verifyRefreshToken(token)).toBeNull()
  })
})

describe('rejection', () => {
  it('refuses an expired token of either kind', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'))
    const access = await signAccessToken({ id: 1, status: 'ACTIVE' })
    const refresh = await signRefreshToken({ id: 1, status: 'ACTIVE' }, 3600)

    vi.setSystemTime(new Date('2026-09-10T11:30:00Z'))

    expect(await verifyAccessToken(access)).toBeNull()
    expect(await verifyRefreshToken(refresh)).toBeNull()
  })

  it('refuses a token whose header, payload or signature was altered', async () => {
    const [header, payload, signature] = (
      await signRefreshToken({ id: 1, status: 'ACTIVE' }, 3600)
    ).split('.')
    const forged = Buffer.from(JSON.stringify({ sub: 2, status: 'ACTIVE' })).toString('base64url')

    expect(await verifyRefreshToken(`x${header}.${payload}.${signature}`)).toBeNull()
    expect(await verifyRefreshToken(`${header}.${forged}.${signature}`)).toBeNull()
    expect(await verifyRefreshToken(`${header}.${payload}.${signature}x`)).toBeNull()
  })

  it('refuses an absent cookie and anything that is not a JWT', async () => {
    for (const bad of [undefined, '', 'not.a.jwt', 'only-one-part']) {
      expect(await verifyAccessToken(bad)).toBeNull()
      expect(await verifyRefreshToken(bad)).toBeNull()
    }
  })
})
