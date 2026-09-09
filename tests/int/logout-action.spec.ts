// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { createSession, renewSession } from '@/services/session-store'
import { hashRefreshToken } from '@/services/session-token'
import { redis } from '@/lib/redis'
import { SessionScope } from './helpers/session-keys'

const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => ctx.cookieJar.set(name, value),
    delete: (name: string) => ctx.cookieJar.delete(name),
  }),
  headers: async () => ({
    get: (name: string) =>
      ({ 'x-forwarded-for': '10.4.4.4', 'user-agent': 'vitest-logout' })[name.toLowerCase()] ??
      null,
  }),
}))

const { logoutAction } = await import('@/actions/auth/logout')

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

let payload: Payload
let uid = 0
const scope = new SessionScope()
const users: number[] = []

const makeUser = async () => {
  const email = `logout-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
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

beforeEach(() => ctx.cookieJar.clear())

afterEach(async () => {
  vi.restoreAllMocks()
  await scope.cleanup()
  for (const id of users.splice(0)) {
    await payload.delete({ collection: 'students', id })
  }
})

describe('logoutAction', () => {
  it('revokes the current session, clears both cookies, writes one LOGOUT row', async () => {
    const user = await makeUser()
    const issued = await createSession(
      { id: user.id as number, status: 'ACTIVE' },
      { ip: '10.4.4.4', userAgent: 'vitest-logout' },
      { rememberMe: true },
    )
    const hash = hashRefreshToken(issued.refreshRaw)
    const sid = (await redis.get(`refresh:${hash}`))!
    ctx.cookieJar.set(ACCESS_COOKIE, issued.accessJwt)
    ctx.cookieJar.set(REFRESH_COOKIE, issued.refreshRaw)

    expect(await logoutAction()).toEqual({ redirectTo: '/' })

    expect(await redis.exists(`session:${sid}`)).toBe(0)
    expect(await redis.exists(`refresh:${hash}`)).toBe(0)
    expect(await redis.sismember(`session:index:${user.id}`, sid)).toBe(0)
    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has(REFRESH_COOKIE)).toBe(false)

    expect(await renewSession(issued.refreshRaw, { ip: 'x', userAgent: 'y' })).toEqual({
      ok: false,
    })
  })

  it('still clears cookies and returns home when no refresh cookie is present', async () => {
    expect(await logoutAction()).toEqual({ redirectTo: '/' })
    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has(REFRESH_COOKIE)).toBe(false)
  })
})
