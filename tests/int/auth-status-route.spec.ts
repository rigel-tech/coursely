// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { signAccessToken } from '@/services/session-token'

const ctx = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
  }),
}))

const { GET } = await import('@/app/(frontend)/next/auth-status/route')

const ACCESS_COOKIE = 'coursely-access'

const read = async (res: Response) => (await res.json()) as { authenticated: boolean }

afterEach(() => {
  ctx.cookieJar.clear()
  vi.useRealTimers()
})

describe('GET /next/auth-status', () => {
  it('reports authenticated for a valid, unexpired access cookie', async () => {
    ctx.cookieJar.set(
      ACCESS_COOKIE,
      signAccessToken({ sub: 123, role: 'STUDENT', status: 'ACTIVE' }),
    )

    expect(await read(await GET())).toEqual({ authenticated: true })
  })

  it('reports not authenticated when the cookie is absent', async () => {
    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated for an expired token', async () => {
    vi.setSystemTime(new Date(Date.now() - 60 * 60 * 1000))
    const stale = signAccessToken({ sub: 123 })
    vi.useRealTimers()
    ctx.cookieJar.set(ACCESS_COOKIE, stale)

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated for a tampered signature', async () => {
    const token = signAccessToken({ sub: 123 })
    const tampered = token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A')
    ctx.cookieJar.set(ACCESS_COOKIE, tampered)

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('sets no cookies on the response', async () => {
    ctx.cookieJar.set(ACCESS_COOKIE, signAccessToken({ sub: 123 }))

    const res = await GET()

    expect(res.headers.get('set-cookie')).toBeNull()
  })
})
