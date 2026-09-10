// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { signAccessToken } from '@/lib/auth/session-token'

const ctx = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
  }),
}))

const { GET } = await import('@/app/(frontend)/next/auth-status/route')

const ACCESS_COOKIE = 'coursely-access'

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
  vi.useRealTimers()
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeIds.clear()
})

describe('GET /next/auth-status', () => {
  it('reports the signed-in student, named by fullName', async () => {
    const student = await seedStudent('Nguyễn Văn A')
    ctx.cookieJar.set(ACCESS_COOKIE, signAccessToken({ id: student.id as number }))

    expect(await read(await GET())).toEqual({
      authenticated: true,
      user: { id: student.id, name: 'Nguyễn Văn A', email: student.email },
    })
  })

  it('falls back to the local part of the email when fullName is blank', async () => {
    const student = await seedStudent()
    ctx.cookieJar.set(ACCESS_COOKIE, signAccessToken({ id: student.id as number }))

    const body = await read(await GET())
    expect(body.user?.name).toBe(student.email.split('@')[0])
  })

  it('reports not authenticated when the token is valid but no such student exists', async () => {
    ctx.cookieJar.set(ACCESS_COOKIE, signAccessToken({ id: 2_000_000_000 }))

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated when the cookie is absent', async () => {
    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated for an expired token', async () => {
    vi.setSystemTime(new Date(Date.now() - 60 * 60 * 1000))
    const stale = signAccessToken({ id: 123 })
    vi.useRealTimers()
    ctx.cookieJar.set(ACCESS_COOKIE, stale)

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated for a tampered signature', async () => {
    const token = signAccessToken({ id: 123 })
    const tampered = token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A')
    ctx.cookieJar.set(ACCESS_COOKIE, tampered)

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('sets no cookies on the response', async () => {
    ctx.cookieJar.set(ACCESS_COOKIE, signAccessToken({ id: 123 }))

    const res = await GET()

    expect(res.headers.get('set-cookie')).toBeNull()
  })
})
