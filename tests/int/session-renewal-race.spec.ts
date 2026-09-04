// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { createSession, renewSession } from '@/services/session-store'
import { hashRefreshToken } from '@/services/session-token'
import { redis } from '@/lib/redis'
import { SessionScope } from './helpers/session-keys'

/**
 * The spec's "Renewal race" edge case: two requests arrive at once with the same
 * still-valid refresh token. Exactly one rotation must win; the other must ride
 * the winner's result, NOT be flagged as token reuse.
 */
const ctx = { ip: '10.9.9.9', userAgent: 'vitest-race' }

let payload: Payload
let uid = 0
const scope = new SessionScope()
const users: number[] = []

const makeUser = async () => {
  const email = `race-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
  const u = await payload.create({
    collection: 'users',
    data: { email, password: 'Secret123', role: 'STUDENT', status: 'ACTIVE' },
  })
  users.push(u.id as number)
  scope.user(u.id as number)
  return u
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  await scope.cleanup()
  for (const id of users.splice(0)) {
    await payload.delete({ collection: 'audit-logs', where: { user: { equals: id } } })
    await payload.delete({ collection: 'users', id })
  }
})

describe('renewSession — concurrent double-submit', () => {
  it('both calls succeed with the SAME fresh tokens, one spent marker, no reuse audit', async () => {
    const user = await makeUser()
    const first = await createSession(
      { id: user.id as number, role: 'STUDENT', status: 'ACTIVE' },
      ctx,
      {
        rememberMe: true,
      },
    )
    const sid = (await redis.get(`refresh:${hashRefreshToken(first.refreshRaw)}`))!

    const [a, b] = await Promise.all([
      renewSession(first.refreshRaw, ctx),
      renewSession(first.refreshRaw, ctx),
    ])

    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    if (!a.ok || !b.ok) return

    // both requests come away with the winner's single fresh token pair
    expect(a.refreshRaw).toBe(b.refreshRaw)
    expect(a.accessJwt).toBe(b.accessJwt)
    expect(a.refreshRaw).not.toBe(first.refreshRaw)

    // the session was rotated exactly once — its current hash is the shared new token,
    // and only the original token was marked spent
    const rec = await redis.hgetall(`session:${sid}`)
    expect(rec.refreshHash).toBe(hashRefreshToken(a.refreshRaw))
    expect(await redis.exists(`spent:${hashRefreshToken(first.refreshRaw)}`)).toBe(1)
    expect(await redis.exists(`spent:${hashRefreshToken(a.refreshRaw)}`)).toBe(0)

    const reuse = await payload.find({
      collection: 'audit-logs',
      where: { and: [{ user: { equals: user.id } }, { action: { equals: 'REFRESH_REUSE' } }] },
      limit: 0,
    })
    expect(reuse.totalDocs).toBe(0)
  })
})
