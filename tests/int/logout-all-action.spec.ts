// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { createSession, renewSession } from '@/services/session-store'
import { redis } from '@/lib/redis'
import { SessionScope } from './helpers/session-keys'

const ctx = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => ctx.cookieJar.set(name, value),
    delete: (name: string) => ctx.cookieJar.delete(name),
  }),
  headers: async () => ({
    get: (name: string) =>
      ({ 'x-forwarded-for': '10.5.5.5', 'user-agent': 'vitest-logout-all' })[name.toLowerCase()] ??
      null,
  }),
}))

const { logoutAllAction } = await import('@/actions/auth/logout-all')

const REFRESH_COOKIE = 'coursely-refresh'

let payload: Payload
let uid = 0
const scope = new SessionScope()
const users: number[] = []

const makeUser = async () => {
  const email = `logoutall-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
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

describe('logoutAllAction', () => {
  it('revokes every session on the account incl. the caller, clears the index', async () => {
    const user = await makeUser()
    const su = { id: user.id as number, status: 'ACTIVE' }
    const a = await createSession(su, { ip: '1.1.1.1', userAgent: 'dev-a' }, { rememberMe: true })
    const b = await createSession(su, { ip: '2.2.2.2', userAgent: 'dev-b' }, { rememberMe: true })
    const c = await createSession(su, { ip: '3.3.3.3', userAgent: 'dev-c' }, { rememberMe: false })

    expect(await redis.scard(`session:index:${user.id}`)).toBe(3)
    ctx.cookieJar.set(REFRESH_COOKIE, a.refreshRaw) // caller holds session A

    expect(await logoutAllAction()).toEqual({ redirectTo: '/' })

    expect(await redis.exists(`session:index:${user.id}`)).toBe(0)
    for (const t of [a, b, c]) {
      expect(await renewSession(t.refreshRaw, { ip: 'x', userAgent: 'y' })).toEqual({ ok: false })
    }
    expect(ctx.cookieJar.has(REFRESH_COOKIE)).toBe(false)
  })
})
