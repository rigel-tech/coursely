// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

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
  headers: async () => new Headers(Object.fromEntries(ctx.reqHeaders)),
}))

const { logoutAction } = await import('@/actions/auth/logout')

const AUTH_COOKIE = 'coursely-token'

let payload: Payload
let uid = 0
const users: number[] = []

const makeUser = async () => {
  const email = `logout-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
  const u = await payload.create({
    collection: 'users',
    data: { email, password: 'Secret123', role: 'STUDENT', status: 'ACTIVE' },
  })
  users.push(u.id as number)
  return { user: u, email, password: 'Secret123' }
}

const sessions = async (id: number | string) =>
  (
    (await payload.findByID({ collection: 'users', id, depth: 0, showHiddenFields: true })) as {
      sessions?: { id: string }[]
    }
  ).sessions ?? []

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

beforeEach(() => {
  ctx.cookieJar.clear()
  ctx.reqHeaders.clear()
  ctx.reqHeaders.set('x-forwarded-for', '10.4.4.4')
  ctx.reqHeaders.set('user-agent', 'vitest-logout')
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const id of users.splice(0)) {
    await payload.delete({ collection: 'audit-logs', where: { user: { equals: id } } })
    await payload.delete({ collection: 'users', id })
  }
})

describe('logoutAction', () => {
  it('revokes only the current session, clears the cookie, writes one LOGOUT row', async () => {
    const { user, email, password } = await makeUser()

    // Two sign-ins → two session rows.
    await payload.login({
      collection: 'users',
      data: { email, password },
      context: { source: 'student' },
    })
    const second = await payload.login({
      collection: 'users',
      data: { email, password },
      context: { source: 'student' },
    })
    expect((await sessions(user.id)).length).toBe(2)

    ctx.cookieJar.set(AUTH_COOKIE, second.token as string)
    ctx.reqHeaders.set('cookie', `${AUTH_COOKIE}=${second.token}`)

    expect(await logoutAction()).toEqual({ redirectTo: '/' })

    // The other session survives; the cookie is gone.
    expect((await sessions(user.id)).length).toBe(1)
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)

    const rows = await payload.find({
      collection: 'audit-logs',
      where: { and: [{ user: { equals: user.id } }, { action: { equals: 'LOGOUT' } }] },
      depth: 0,
    })
    expect(rows.totalDocs).toBe(1)
    expect(rows.docs[0]).toMatchObject({
      action: 'LOGOUT',
      ip: '10.4.4.4',
      userAgent: 'vitest-logout',
    })
  })

  it('still clears the cookie and returns home when no token is present', async () => {
    expect(await logoutAction()).toEqual({ redirectTo: '/' })
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)
  })
})
