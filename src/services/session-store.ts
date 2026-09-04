/**
 * Redis-backed student session store (§ access+refresh sessions). Owns the
 * session record, the refresh-token→session lookup, in-place rotation with
 * reuse detection, and single-/all-session revocation. No HTTP — callers own the
 * cookies and `next/headers`.
 *
 * Keyspace (every key self-expires, so an abandoned session heals itself):
 *
 *   session:{sid}            Hash   — the record (see fields in `createSession`)
 *   refresh:{hash}           String — → sid; the current, spendable refresh token
 *   spent:{hash}             String — → {sid,lineId,userId}; a rotated-away token.
 *                                     Its reappearance after the grace window is theft.
 *   race:{sid}               String — → the winner's fresh tokens, `RENEWAL_GRACE_SEC`.
 *                                     A concurrent double-submit rides this instead of
 *                                     tripping the reuse alarm.
 *   lock:sess:{sid}          String — single-flight on rotation, `REFRESH_LOCK_MS`
 *   session:index:{userId}   Set    — that account's active sids (walked by logout-all)
 *
 * Renewal is Redis-only: `role`/`status` are stamped onto the record at sign-in
 * and carried forward on each rotation. An account disabled mid-session is out of
 * scope here — a Users afterChange hook that calls `revokeAllForUser` is the
 * clean follow-up; renewal deliberately does no Payload read (spec Q2 → B).
 */
import { randomBytes } from 'node:crypto'

import { redis } from '@/lib/redis'
import {
  REFRESH_ABSOLUTE_TTL_SEC,
  REFRESH_IDLE_TTL_SEC,
  REFRESH_LOCK_MS,
  REFRESH_NO_REMEMBER_TTL_SEC,
  REMEMBER_ME_MAX_AGE_SEC,
  RENEWAL_GRACE_SEC,
} from '@/lib/constants/auth'
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '@/services/session-token'

export type SessionCtx = { ip: string; userAgent: string }
export type SessionUser = { id: number; role?: string; status?: string }

export type IssuedSession = {
  accessJwt: string
  refreshRaw: string
  rememberMe: boolean
  /** seconds; `undefined` ⇒ the caller sets a browser-session cookie (no maxAge) */
  refreshCookieMaxAge?: number
}

export type RenewResult =
  ({ ok: true; user: SessionUser } & IssuedSession) | { ok: false; reuse?: true }

const sessionKey = (sid: string) => `session:${sid}`
const refreshKey = (hash: string) => `refresh:${hash}`
const spentKey = (hash: string) => `spent:${hash}`
const raceKey = (sid: string) => `race:${sid}`
const lockKey = (sid: string) => `lock:sess:${sid}`
const indexKey = (userId: number | string) => `session:index:${userId}`

const nowSec = () => Math.floor(Date.now() / 1000)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type RacePayload = { user: SessionUser } & IssuedSession

/** Read `race:{sid}` once — the winner's freshly-minted tokens, or null. */
async function readRace(sid: string): Promise<RacePayload | null> {
  const raw = await redis.get(raceKey(sid))
  return raw ? (JSON.parse(raw) as RacePayload) : null
}

/** Poll `race:{sid}` for up to ~3s — used by a lock-loser whose winner may still be mid-rotation. */
async function waitForRace(sid: string): Promise<RacePayload | null> {
  for (let i = 0; i < 20; i++) {
    const p = await readRace(sid)
    if (p) return p
    await sleep(150)
  }
  return null
}

function issuedFor(user: SessionUser, rememberMe: boolean, refreshRaw: string): IssuedSession {
  return {
    accessJwt: signAccessToken({ sub: user.id, role: user.role, status: user.status }),
    refreshRaw,
    rememberMe,
    refreshCookieMaxAge: rememberMe ? REMEMBER_ME_MAX_AGE_SEC : undefined,
  }
}

/** Mint a brand-new session line for a just-authenticated user. */
export async function createSession(
  user: SessionUser,
  ctx: SessionCtx,
  opts: { rememberMe: boolean },
): Promise<IssuedSession> {
  const sid = randomBytes(16).toString('base64url')
  const refreshRaw = generateRefreshToken()
  const hash = hashRefreshToken(refreshRaw)

  const now = nowSec()
  const idleTtl = opts.rememberMe ? REFRESH_IDLE_TTL_SEC : REFRESH_NO_REMEMBER_TTL_SEC
  const absoluteExpiresAt = now + REFRESH_ABSOLUTE_TTL_SEC
  const expiresAt = Math.min(now + idleTtl, absoluteExpiresAt)
  const ttl = expiresAt - now
  const nowIso = new Date(now * 1000).toISOString()

  await redis
    .multi()
    .hset(sessionKey(sid), {
      userId: String(user.id),
      lineId: sid,
      refreshHash: hash,
      role: user.role ?? '',
      status: user.status ?? '',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      rememberMe: opts.rememberMe ? '1' : '0',
      createdAt: nowIso,
      renewedAt: nowIso,
      expiresAt: String(expiresAt),
      absoluteExpiresAt: String(absoluteExpiresAt),
    })
    .expire(sessionKey(sid), ttl)
    .set(refreshKey(hash), sid, 'EX', ttl)
    .sadd(indexKey(user.id), sid)
    .expire(indexKey(user.id), REFRESH_ABSOLUTE_TTL_SEC)
    .exec()

  return issuedFor(user, opts.rememberMe, refreshRaw)
}

/** Rotate a session under its single-flight lock. Caller holds `lock:sess:{sid}`. */
async function rotate(sid: string, oldHash: string, _ctx: SessionCtx): Promise<RenewResult> {
  const rec = await redis.hgetall(sessionKey(sid))
  if (!rec.userId) return { ok: false }

  const now = nowSec()
  const absoluteExpiresAt = Number(rec.absoluteExpiresAt)
  const userId = Number(rec.userId)

  if (now >= Number(rec.expiresAt) || now >= absoluteExpiresAt) {
    await redis
      .multi()
      .del(sessionKey(sid))
      .del(refreshKey(oldHash))
      .srem(indexKey(userId), sid)
      .exec()
    return { ok: false }
  }

  const rememberMe = rec.rememberMe === '1'
  const user: SessionUser = {
    id: userId,
    role: rec.role || undefined,
    status: rec.status || undefined,
  }

  const newRefreshRaw = generateRefreshToken()
  const newHash = hashRefreshToken(newRefreshRaw)
  const issued = issuedFor(user, rememberMe, newRefreshRaw)

  const idleTtl = rememberMe ? REFRESH_IDLE_TTL_SEC : REFRESH_NO_REMEMBER_TTL_SEC
  const newExpiresAt = Math.min(now + idleTtl, absoluteExpiresAt)
  const newTtl = newExpiresAt - now
  const oldTtl = Math.max(1, await redis.ttl(refreshKey(oldHash)))

  await redis
    .multi()
    .del(refreshKey(oldHash))
    .set(refreshKey(newHash), sid, 'EX', newTtl)
    .set(spentKey(oldHash), JSON.stringify({ sid, lineId: rec.lineId, userId }), 'EX', oldTtl)
    .hset(sessionKey(sid), {
      refreshHash: newHash,
      renewedAt: new Date(now * 1000).toISOString(),
      expiresAt: String(newExpiresAt),
    })
    .expire(sessionKey(sid), newTtl)
    .set(raceKey(sid), JSON.stringify({ user, ...issued }), 'EX', RENEWAL_GRACE_SEC)
    .sadd(indexKey(userId), sid)
    .expire(indexKey(userId), REFRESH_ABSOLUTE_TTL_SEC)
    .exec()

  return { ok: true, user, ...issued }
}

/**
 * Given a raw refresh token: rotate the session (new access + new refresh), or —
 * if the token is recognised but already spent past the grace window — treat it
 * as theft, revoke the whole line, and record it. Throws only on a Redis failure,
 * which the route guard catches and treats as signed-out (fail closed).
 */
export async function renewSession(rawRefresh: string, ctx: SessionCtx): Promise<RenewResult> {
  const hash = hashRefreshToken(rawRefresh)
  const sid = await redis.get(refreshKey(hash))

  if (sid) {
    const locked = await redis.set(lockKey(sid), '1', 'PX', REFRESH_LOCK_MS, 'NX')
    if (!locked) {
      const cached = await waitForRace(sid)
      return cached ? { ok: true, ...cached } : { ok: false }
    }
    try {
      return await rotate(sid, hash, ctx)
    } finally {
      await redis.del(lockKey(sid))
    }
  }

  const spentRaw = await redis.get(spentKey(hash))
  if (spentRaw) {
    const info = JSON.parse(spentRaw) as { sid: string; lineId: string; userId: number }

    // `race:{sid}` is written in the same MULTI as `spent:{hash}`, so if it is
    // still present this replay is a concurrent double-submit, not theft — hand
    // back the winner's tokens. Absent ⇒ the grace window lapsed ⇒ genuine reuse.
    const cached = await readRace(info.sid)
    if (cached) return { ok: true, ...cached }

    await revokeSession(info.sid)
    await writeReuseAudit(info.userId, ctx)
    return { ok: false, reuse: true }
  }

  return { ok: false }
}

/** End one session. Idempotent; a missing sid is a no-op. Caller writes the audit row. */
export async function revokeSession(sid: string): Promise<void> {
  const [refreshHash, userId] = await redis.hmget(sessionKey(sid), 'refreshHash', 'userId')
  const m = redis.multi().del(sessionKey(sid)).del(raceKey(sid))
  if (refreshHash) m.del(refreshKey(refreshHash))
  if (userId) m.srem(indexKey(userId), sid)
  await m.exec()
}

/** End every session on an account, including the caller's. Returns the count revoked. */
export async function revokeAllForUser(userId: number): Promise<number> {
  const sids = await redis.smembers(indexKey(userId))
  for (const sid of sids) await revokeSession(sid)
  await redis.del(indexKey(userId))
  return sids.length
}

/** Read-only resolver for the logout actions: current token, or a rotated-away one. */
export async function findSessionByRefresh(
  rawRefresh: string,
): Promise<{ sid: string; userId: number } | null> {
  const hash = hashRefreshToken(rawRefresh)

  const sid = await redis.get(refreshKey(hash))
  if (sid) {
    const userId = await redis.hget(sessionKey(sid), 'userId')
    if (userId) return { sid, userId: Number(userId) }
  }

  const spentRaw = await redis.get(spentKey(hash))
  if (spentRaw) {
    const p = JSON.parse(spentRaw) as { sid: string; userId: number }
    return { sid: p.sid, userId: p.userId }
  }

  return null
}

/**
 * Best-effort `REFRESH_REUSE` audit row. Dynamically imports Payload so the
 * static module graph stays free of it (this file is imported by `proxy`). A
 * failure here must not swallow the security response, so it only logs.
 */
async function writeReuseAudit(userId: number, ctx: SessionCtx): Promise<void> {
  try {
    const { getPayload } = await import('payload')
    const configPromise = (await import('@payload-config')).default
    const payload = await getPayload({ config: await configPromise })
    await payload.create({
      collection: 'audit-logs',
      data: { action: 'REFRESH_REUSE', user: userId, ip: ctx.ip, userAgent: ctx.userAgent },
    })
  } catch (err) {
    console.error('failed to write REFRESH_REUSE audit row', err)
  }
}
