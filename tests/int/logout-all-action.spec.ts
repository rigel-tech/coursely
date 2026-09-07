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

const { logoutAllAction } = await import('@/actions/auth/logout-all')

const AUTH_COOKIE = 'coursely-token'

let payload: Payload
let uid = 0
const users: number[] = []

const makeUser = async () => {
  const email = `logoutall-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
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
  ctx.reqHeaders.set('x-forwarded-for', '10.5.5.5')
  ctx.reqHeaders.set('user-agent', 'vitest-logout-all')
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const id of users.splice(0)) {
    await payload.delete({ collection: 'audit-logs', where: { user: { equals: id } } })
    await payload.delete({ collection: 'users', id })
  }
})

describe('logoutAllAction', () => {
  it('empties every session on the account incl. the caller, clears the cookie, audits once', async () => {
    const { user, email, password } = await makeUser()

    await payload.login({
      collection: 'users',
      data: { email, password },
      context: { source: 'student' },
    })
    await payload.login({
      collection: 'users',
      data: { email, password },
      context: { source: 'student' },
    })
    const caller = await payload.login({
      collection: 'users',
      data: { email, password },
      context: { source: 'student' },
    })
    expect((await sessions(user.id)).length).toBe(3)

    ctx.cookieJar.set(AUTH_COOKIE, caller.token as string)
    ctx.reqHeaders.set('cookie', `${AUTH_COOKIE}=${caller.token}`)

    expect(await logoutAllAction()).toEqual({ redirectTo: '/' })

    expect((await sessions(user.id)).length).toBe(0)
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)

    const rows = await payload.find({
      collection: 'audit-logs',
      where: { and: [{ user: { equals: user.id } }, { action: { equals: 'LOGOUT_ALL' } }] },
      depth: 0,
    })
    expect(rows.totalDocs).toBe(1)
    expect(rows.docs[0]).toMatchObject({
      action: 'LOGOUT_ALL',
      ip: '10.5.5.5',
      userAgent: 'vitest-logout-all',
    })
  })
})
