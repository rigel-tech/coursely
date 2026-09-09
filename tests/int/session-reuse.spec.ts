// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { createSession, renewSession } from '@/services/session-store'
import { hashRefreshToken } from '@/services/session-token'
import { redis } from '@/lib/redis'
import { SessionScope } from './helpers/session-keys'

/**
 * User Story 4: a refresh token replayed after a legitimate rotation (past the
 * grace window) is recognised as theft — the whole session line is revoked, so
 * the legitimate holder is locked out too and has to sign in again.
 */
const ctx = { ip: '203.0.113.7', userAgent: 'vitest-thief' }

let payload: Payload
let uid = 0
const scope = new SessionScope()
const users: number[] = []

const makeUser = async () => {
  const email = `reuse-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
  const u = await payload.create({
    collection: 'students',
    data: { email, password: 'Secret123', status: 'ACTIVE' },
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
    await payload.delete({ collection: 'students', id })
  }
})

describe('renewSession — refresh token reuse', () => {
  it('replaying a spent token past the grace window revokes the whole line', async () => {
    const user = await makeUser()
    const first = await createSession({ id: user.id as number, status: 'ACTIVE' }, ctx, {
      rememberMe: true,
    })
    const captured = first.refreshRaw
    const sid = (await redis.get(`refresh:${hashRefreshToken(captured)}`))!

    const legit = await renewSession(captured, ctx)
    if (!legit.ok) throw new Error('expected the legitimate renewal to succeed')

    // fast-forward past the race grace window so the replay is theft, not a race
    await redis.del(`race:${sid}`)

    const replay = await renewSession(captured, ctx)
    expect(replay).toEqual({ ok: false, reuse: true })

    // whole line gone
    expect(await redis.exists(`session:${sid}`)).toBe(0)
    expect(await redis.exists(`refresh:${hashRefreshToken(legit.refreshRaw)}`)).toBe(0)
    expect(await redis.sismember(`session:index:${user.id}`, sid)).toBe(0)

    // the legitimate holder is now locked out too
    expect(await renewSession(legit.refreshRaw, ctx)).toEqual({ ok: false })
  })
})
