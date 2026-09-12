// @vitest-environment node
// Signing out is now two cookie deletions and nothing else — no record to revoke, no
// datastore to reach. What is worth pinning is that it stays that way: both cookies go,
// the caller is told where to navigate, and it never redirects on its own (a redirect in
// the same pass would drop the Set-Cookie — see INVARIANTS).

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signAccessToken, signRefreshToken } from '@/lib/auth/session-token'
import { REFRESH_TTL_SEC } from '@/lib/constants/auth'

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
}))

const { logoutAction } = await import('@/actions/student/logout')

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

const student = { id: 1, status: 'ACTIVE' }

beforeEach(() => ctx.cookieJar.clear())

describe('logoutAction', () => {
  it('clears both cookies and hands the caller a destination', async () => {
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken(student))
    ctx.cookieJar.set(REFRESH_COOKIE, await signRefreshToken(student, REFRESH_TTL_SEC))

    expect(await logoutAction()).toEqual({ redirectTo: '/' })

    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has(REFRESH_COOKIE)).toBe(false)
  })

  it('still clears and returns home when there was no session to begin with', async () => {
    expect(await logoutAction()).toEqual({ redirectTo: '/' })

    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has(REFRESH_COOKIE)).toBe(false)
  })
})
