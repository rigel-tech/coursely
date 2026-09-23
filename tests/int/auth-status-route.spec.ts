// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { signAccessToken, signRefreshToken, verifyAccessToken } from '@/lib/auth/session-token'
import { REFRESH_TTL_SEC } from '@/lib/constants/auth'

const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  writes: [] as string[],
  deletes: [] as string[],
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => {
      ctx.writes.push(name)
      ctx.cookieJar.set(name, value)
    },
    delete: (name: string) => {
      ctx.deletes.push(name)
      ctx.cookieJar.delete(name)
    },
  }),
}))

const { GET } = await import('@/app/(frontend)/next/auth-status/route')

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

const read = async (res: Response) =>
  (await res.json()) as {
    authenticated: boolean
    user?: { id: number; name: string; email?: string }
  }

let payload: Payload
const madeIds = new Set<number>()

const uniqueEmail = () => `auth-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async (fullName?: string) => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: 'Secret123', fullName, status: 'ACTIVE' },
  })
  madeIds.add(student.id as number)
  return student
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  ctx.cookieJar.clear()
  ctx.writes.length = 0
  ctx.deletes.length = 0
  vi.useRealTimers()
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeIds.clear()
})

describe('GET /next/auth-status', () => {
  it('reports the signed-in student, named by fullName', async () => {
    const student = await seedStudent('Nguyễn Văn A')
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: student.id as number }))

    expect(await read(await GET())).toEqual({
      authenticated: true,
      user: { id: student.id, name: 'Nguyễn Văn A', email: student.email },
    })
  })

  it('falls back to the local part of the email when fullName is blank', async () => {
    const student = await seedStudent()
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: student.id as number }))

    const body = await read(await GET())
    expect(body.user?.name).toBe(student.email.split('@')[0])
  })

  it('reports not authenticated when the token is valid but no such student exists', async () => {
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: 2_000_000_000 }))

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated when the cookie is absent', async () => {
    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated for an expired token', async () => {
    vi.setSystemTime(new Date(Date.now() - 60 * 60 * 1000))
    const stale = await signAccessToken({ id: 123 })
    vi.useRealTimers()
    ctx.cookieJar.set(ACCESS_COOKIE, stale)

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated for a tampered signature', async () => {
    const token = await signAccessToken({ id: 123 })
    const tampered = token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A')
    ctx.cookieJar.set(ACCESS_COOKIE, tampered)

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('writes no cookie while the access token is still valid', async () => {
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: 123 }))

    await GET()

    expect(ctx.writes).toEqual([])
  })
})

describe('GET /next/auth-status — session renewal', () => {
  it('renews from the refresh token and reports the student in the same response', async () => {
    const student = await seedStudent('Nguyễn Văn B')
    ctx.cookieJar.set(
      REFRESH_COOKIE,
      await signRefreshToken({ id: student.id as number, status: 'ACTIVE' }, REFRESH_TTL_SEC),
    )

    const body = await read(await GET())

    // One round trip, not two. Renewing in `proxy` writes onto the response while this
    // handler still reads the stale request cookie, so the header would show signed-out
    // for one page load after every access-token lapse.
    expect(body.authenticated).toBe(true)
    expect(body.user?.id).toBe(student.id)
    expect(ctx.writes).toEqual([ACCESS_COOKIE])
    await expect(verifyAccessToken(ctx.cookieJar.get(ACCESS_COOKIE))).resolves.toEqual({
      id: student.id,
      status: 'ACTIVE',
    })
  })

  it('clears both cookies and reports signed out when the refresh token is unusable', async () => {
    ctx.cookieJar.set(REFRESH_COOKIE, 'not.a.token')

    expect(await read(await GET())).toEqual({ authenticated: false })
    expect(ctx.deletes).toEqual([ACCESS_COOKIE, REFRESH_COOKIE])
  })
})

// This route now mints session cookies, so it falls under the rule that a response carrying
// one is never shared-cacheable (INVARIANTS, "A response that carries a session Set-Cookie
// must be private, no-store"). The header is unconditional: per-student JSON is not
// shareable in any of these cases, and a branch is one more thing to get wrong.
describe('GET /next/auth-status — never shared-cacheable', () => {
  it('sends private, no-store when it renews', async () => {
    const student = await seedStudent()
    ctx.cookieJar.set(
      REFRESH_COOKIE,
      await signRefreshToken({ id: student.id as number, status: 'ACTIVE' }, REFRESH_TTL_SEC),
    )

    expect((await GET()).headers.get('cache-control')).toBe('private, no-store')
  })

  it('sends private, no-store for a signed-in student it did not renew', async () => {
    const student = await seedStudent()
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: student.id as number }))

    expect((await GET()).headers.get('cache-control')).toBe('private, no-store')
  })

  it('sends private, no-store for an anonymous visitor', async () => {
    expect((await GET()).headers.get('cache-control')).toBe('private, no-store')
  })
})
