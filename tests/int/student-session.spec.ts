// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { signAccessToken } from '@/services/session-token'

const ctx = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
  }),
}))

const { getStudentSession } = await import('@/lib/auth/student-session')

const ACCESS_COOKIE = 'coursely-access'

let payload: Payload
const madeIds = new Set<number>()

const uniqueEmail = () => `sess-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async (status: 'ACTIVE' | 'DISABLED' = 'ACTIVE') => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: 'Secret123', fullName: 'Học Viên Test', status },
  })
  madeIds.add(student.id as number)
  return student
}

/** Put a well-formed access token for `id` in the jar. */
const signIn = (id: number, status = 'ACTIVE') => {
  ctx.cookieJar.set(ACCESS_COOKIE, signAccessToken({ sub: id, status }))
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  ctx.cookieJar.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeIds.clear()
})

describe('getStudentSession — a signed-in student', () => {
  it('returns the student document the access token points at', async () => {
    const student = await seedStudent()
    signIn(student.id as number)

    const session = await getStudentSession()

    expect(session?.id).toBe(student.id)
    expect(session?.email).toBe(student.email)
    expect(session?.fullName).toBe('Học Viên Test')
  })

  it('reads the live status, not the one stamped into the token at sign-in', async () => {
    const student = await seedStudent()
    signIn(student.id as number, 'ACTIVE')
    await payload.update({
      collection: 'students',
      id: student.id,
      data: { status: 'DISABLED' },
    })

    expect((await getStudentSession())?.status).toBe('DISABLED')
  })
})

describe('getStudentSession — no session', () => {
  it('returns null with no cookie at all', async () => {
    expect(await getStudentSession()).toBeNull()
  })

  it('returns null for a tampered signature', async () => {
    const student = await seedStudent()
    const token = signAccessToken({ sub: student.id as number, status: 'ACTIVE' })
    ctx.cookieJar.set(ACCESS_COOKIE, token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A'))

    expect(await getStudentSession()).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const student = await seedStudent()
    vi.setSystemTime(new Date(Date.now() - 60 * 60 * 1000))
    const stale = signAccessToken({ sub: student.id as number, status: 'ACTIVE' })
    vi.useRealTimers()
    ctx.cookieJar.set(ACCESS_COOKIE, stale)

    expect(await getStudentSession()).toBeNull()
  })
})

describe('getStudentSession — a session trouble must not break the page', () => {
  it('returns null when the token is valid but no such student exists', async () => {
    signIn(2_000_000_000)

    expect(await getStudentSession()).toBeNull()
  })
})
