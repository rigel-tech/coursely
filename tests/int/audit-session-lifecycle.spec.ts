// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { createSession, renewSession } from '@/services/session-store'
import { hashRefreshToken } from '@/services/session-token'
import { redis } from '@/lib/redis'
import { SessionScope } from './helpers/session-keys'

/**
 * User Story 5: every session-lifecycle event leaves exactly one distinct,
 * attributable audit row — sign-in, sign-out, sign-out-everywhere, reuse.
 */
const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  reqHeaders: new Map<string, string>(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => ctx.cookieJar.set(name, value),
    delete: (name: string) => ctx.cookieJar.delete(name),
  }),
  headers: async () => ({ get: (name: string) => ctx.reqHeaders.get(name.toLowerCase()) ?? null }),
}))

const { loginAction } = await import('@/actions/auth/login')
const { logoutAction } = await import('@/actions/auth/logout')
const { logoutAllAction } = await import('@/actions/auth/logout-all')
const { initialLoginState } = await import('@/lib/constants/login-state')

const REFRESH_COOKIE = 'coursely-refresh'

let payload: Payload
const scope = new SessionScope()
const emails = new Set<string>()

const uniqueEmail = () => {
  const e = `audit-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  emails.add(e)
  return e
}

const loginForm = (email: string, password: string) => {
  const fd = new FormData()
  fd.set('email', email)
  fd.set('password', password)
  return fd
}

const actionsFor = (ip: string, ua: string) => {
  ctx.reqHeaders.set('x-forwarded-for', ip)
  ctx.reqHeaders.set('user-agent', ua)
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

beforeEach(() => {
  ctx.cookieJar.clear()
  ctx.reqHeaders.clear()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await scope.cleanup()
  for (const email of emails) {
    await redis.del(`rate:login:email:${email}`)
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 10,
      depth: 0,
    })
    for (const u of docs) {
      await payload.delete({ collection: 'audit-logs', where: { user: { equals: u.id } } })
      await payload.delete({ collection: 'users', id: u.id })
    }
  }
  emails.clear()
})

describe('audit trail across the session lifecycle', () => {
  it('writes exactly one attributable row per event', async () => {
    const email = uniqueEmail()
    const password = 'Secret123'
    const user = await payload.create({
      collection: 'users',
      data: { email, password, role: 'STUDENT', status: 'ACTIVE' },
    })
    scope.user(user.id as number)

    // 1 — sign in
    actionsFor('11.11.11.11', 'ua-login')
    await loginAction(initialLoginState, loginForm(email, password))
    const refresh = ctx.cookieJar.get(REFRESH_COOKIE)!

    // 2 — sign out this device
    actionsFor('22.22.22.22', 'ua-logout')
    await logoutAction()

    // 3 — sign in again, then sign out everywhere
    actionsFor('33.33.33.33', 'ua-login-2')
    await loginAction(initialLoginState, loginForm(email, password))
    actionsFor('44.44.44.44', 'ua-logout-all')
    await logoutAllAction()

    // 4 — sign in again, rotate once, replay the old token past the grace window
    const seeded = await createSession(
      { id: user.id as number, role: 'STUDENT', status: 'ACTIVE' },
      { ip: '55.55.55.55', userAgent: 'ua-seed' },
      { rememberMe: true },
    )
    const sid = (await redis.get(`refresh:${hashRefreshToken(seeded.refreshRaw)}`))!
    await renewSession(seeded.refreshRaw, { ip: '55.55.55.55', userAgent: 'ua-legit' })
    await redis.del(`race:${sid}`)
    await renewSession(seeded.refreshRaw, { ip: '66.66.66.66', userAgent: 'ua-thief' })

    const rows = (
      await payload.find({
        collection: 'audit-logs',
        where: { user: { equals: user.id } },
        sort: 'createdAt',
        depth: 0,
        limit: 50,
      })
    ).docs

    const byAction = (a: string) => rows.filter((r) => r.action === a)
    expect(byAction('LOGIN_SUCCESS')).toHaveLength(2)
    expect(byAction('LOGOUT')).toHaveLength(1)
    expect(byAction('LOGOUT_ALL')).toHaveLength(1)
    expect(byAction('REFRESH_REUSE')).toHaveLength(1)

    // every row is attributable to the account
    expect(rows.every((r) => (typeof r.user === 'object' ? r.user?.id : r.user) === user.id)).toBe(
      true,
    )
    // the security events carry the acting address + agent
    expect(byAction('LOGOUT')[0]).toMatchObject({ ip: '22.22.22.22', userAgent: 'ua-logout' })
    expect(byAction('LOGOUT_ALL')[0]).toMatchObject({
      ip: '44.44.44.44',
      userAgent: 'ua-logout-all',
    })
    expect(byAction('REFRESH_REUSE')[0]).toMatchObject({ ip: '66.66.66.66', userAgent: 'ua-thief' })
    expect(refresh).toBeTruthy()
  })
})
