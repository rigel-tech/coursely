import { afterEach, describe, expect, it } from 'vitest'

import {
  createSession,
  renewSession,
  revokeSession,
  revokeAllForUser,
  findSessionByRefresh,
  type SessionUser,
} from '@/services/session-store'
import { hashRefreshToken } from '@/services/session-token'
import { verifyAccessToken } from '@/lib/auth/access-token'
import { redis } from '@/lib/redis'
import { REMEMBER_ME_MAX_AGE_SEC } from '@/lib/constants/auth'
import { SessionScope } from './helpers/session-keys'

const ctx = { ip: '10.0.0.1', userAgent: 'vitest-session-store' }
const scope = new SessionScope()

let uid = 0
const freshUser = (over: Partial<SessionUser> = {}): SessionUser => {
  const id = scope.user(900_000 + uid++)
  return { id, role: over.role ?? 'STUDENT', status: over.status ?? 'ACTIVE' }
}

afterEach(() => scope.cleanup())

describe('createSession', () => {
  it('writes the record, the refresh lookup and the per-user index; mints a usable access token', async () => {
    const user = freshUser()
    const issued = await createSession(user, ctx, { rememberMe: true })

    expect(verifyAccessToken(issued.accessJwt)).toEqual({
      id: user.id,
      role: 'STUDENT',
      status: 'ACTIVE',
    })
    expect(issued.refreshCookieMaxAge).toBe(REMEMBER_ME_MAX_AGE_SEC)

    const hash = hashRefreshToken(issued.refreshRaw)
    const sid = await redis.get(`refresh:${hash}`)
    expect(sid).toBeTruthy()

    const rec = await redis.hgetall(`session:${sid}`)
    expect(rec).toMatchObject({
      userId: String(user.id),
      lineId: sid!,
      refreshHash: hash,
      role: 'STUDENT',
      status: 'ACTIVE',
      rememberMe: '1',
    })
    expect(await redis.sismember(`session:index:${user.id}`, sid!)).toBe(1)

    const ttl = await redis.ttl(`session:${sid}`)
    expect(ttl).toBeGreaterThan(29 * 24 * 60 * 60)
    expect(ttl).toBeLessThanOrEqual(30 * 24 * 60 * 60)
  })

  it('without rememberMe: no cookie maxAge and a ~12h server record', async () => {
    const user = freshUser()
    const issued = await createSession(user, ctx, { rememberMe: false })

    expect(issued.refreshCookieMaxAge).toBeUndefined()
    const sid = await redis.get(`refresh:${hashRefreshToken(issued.refreshRaw)}`)
    const ttl = await redis.ttl(`session:${sid}`)
    expect(ttl).toBeGreaterThan(11 * 60 * 60)
    expect(ttl).toBeLessThanOrEqual(12 * 60 * 60)
  })
})

describe('renewSession — happy path', () => {
  it('rotates in place: new tokens, old hash retired, spent marker set, same sid/lineId', async () => {
    const user = freshUser()
    const first = await createSession(user, ctx, { rememberMe: true })
    const oldHash = hashRefreshToken(first.refreshRaw)
    const sid = await redis.get(`refresh:${oldHash}`)

    const r = await renewSession(first.refreshRaw, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return

    expect(r.refreshRaw).not.toBe(first.refreshRaw)
    // a fresh, valid access token is issued (byte-equal to the first only when minted
    // in the same wall-clock second — same claims, same iat — which is not a defect)
    expect(verifyAccessToken(r.accessJwt)).toEqual({
      id: user.id,
      role: 'STUDENT',
      status: 'ACTIVE',
    })

    const newHash = hashRefreshToken(r.refreshRaw)
    expect(await redis.get(`refresh:${oldHash}`)).toBeNull()
    expect(await redis.get(`refresh:${newHash}`)).toBe(sid)

    const spent = JSON.parse((await redis.get(`spent:${oldHash}`))!)
    expect(spent).toMatchObject({ sid, userId: user.id })

    const rec = await redis.hgetall(`session:${sid}`)
    expect(rec.refreshHash).toBe(newHash)
    expect(rec.lineId).toBe(sid)
  })
})

describe('renewSession — refused', () => {
  it('unknown refresh token → { ok: false } with no reuse flag', async () => {
    expect(await renewSession('not-a-real-token', ctx)).toEqual({ ok: false })
  })

  it('past expiresAt → refused and the record is cleaned', async () => {
    const user = freshUser()
    const issued = await createSession(user, ctx, { rememberMe: true })
    const hash = hashRefreshToken(issued.refreshRaw)
    const sid = await redis.get(`refresh:${hash}`)
    await redis.hset(`session:${sid}`, { expiresAt: String(Math.floor(Date.now() / 1000) - 5) })

    expect(await renewSession(issued.refreshRaw, ctx)).toEqual({ ok: false })
    expect(await redis.exists(`session:${sid}`)).toBe(0)
    expect(await redis.exists(`refresh:${hash}`)).toBe(0)
  })

  it('past the absolute cap → refused even though the idle window is still open', async () => {
    const user = freshUser()
    const issued = await createSession(user, ctx, { rememberMe: true })
    const hash = hashRefreshToken(issued.refreshRaw)
    const sid = await redis.get(`refresh:${hash}`)
    const now = Math.floor(Date.now() / 1000)
    await redis.hset(`session:${sid}`, {
      expiresAt: String(now + 3600),
      absoluteExpiresAt: String(now - 5),
    })

    expect(await renewSession(issued.refreshRaw, ctx)).toEqual({ ok: false })
  })
})

describe('revokeSession / revokeAllForUser', () => {
  it('revokeSession drops the record, the lookup and the index entry', async () => {
    const user = freshUser()
    const issued = await createSession(user, ctx, { rememberMe: true })
    const hash = hashRefreshToken(issued.refreshRaw)
    const sid = (await redis.get(`refresh:${hash}`))!

    await revokeSession(sid)

    expect(await redis.exists(`session:${sid}`)).toBe(0)
    expect(await redis.exists(`refresh:${hash}`)).toBe(0)
    expect(await redis.sismember(`session:index:${user.id}`, sid)).toBe(0)
    expect(await renewSession(issued.refreshRaw, ctx)).toEqual({ ok: false })
  })

  it('revokeAllForUser kills every session incl. the caller and clears the index', async () => {
    const user = freshUser()
    const a = await createSession(user, ctx, { rememberMe: true })
    const b = await createSession(user, ctx, { rememberMe: true })
    const c = await createSession(user, ctx, { rememberMe: false })

    expect(await redis.scard(`session:index:${user.id}`)).toBe(3)
    expect(await revokeAllForUser(user.id)).toBe(3)

    expect(await redis.exists(`session:index:${user.id}`)).toBe(0)
    for (const t of [a, b, c]) {
      expect(await redis.exists(`refresh:${hashRefreshToken(t.refreshRaw)}`)).toBe(0)
      expect(await renewSession(t.refreshRaw, ctx)).toEqual({ ok: false })
    }
  })
})

describe('findSessionByRefresh', () => {
  it('resolves a current token, a rotated-away token, and null for garbage', async () => {
    const user = freshUser()
    const first = await createSession(user, ctx, { rememberMe: true })
    const sid = (await redis.get(`refresh:${hashRefreshToken(first.refreshRaw)}`))!

    expect(await findSessionByRefresh(first.refreshRaw)).toEqual({ sid, userId: user.id })

    const r = await renewSession(first.refreshRaw, ctx)
    if (!r.ok) throw new Error('expected renew to succeed')

    // the pre-rotation token still resolves to the same session via `spent:`
    expect(await findSessionByRefresh(first.refreshRaw)).toEqual({ sid, userId: user.id })
    // the fresh token resolves too
    expect(await findSessionByRefresh(r.refreshRaw)).toEqual({ sid, userId: user.id })

    expect(await findSessionByRefresh('garbage')).toBeNull()
  })
})
