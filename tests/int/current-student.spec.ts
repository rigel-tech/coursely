// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { signAccessToken, signRefreshToken, verifyAccessToken } from '@/lib/auth/session-token'
import { REFRESH_TTL_SEC } from '@/lib/constants/auth'

// The jar records every write and delete, not only the values left behind: "renewal wrote
// nothing" and "renewal wrote the same value back" are indistinguishable from the map alone,
// and the first of those is the contract.
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

const { getSessionStudent, ensureSessionStudent } = await import('@/lib/auth/session-student')

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

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
const signIn = async (id: number, status = 'ACTIVE') => {
  ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: id, status }))
}

/** Put only a well-formed refresh token in the jar — the state once the access token lapses. */
const signInWithRefreshOnly = async (id: number, status = 'ACTIVE') => {
  ctx.cookieJar.set(REFRESH_COOKIE, await signRefreshToken({ id, status }, REFRESH_TTL_SEC))
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  ctx.cookieJar.clear()
  ctx.writes.length = 0
  ctx.deletes.length = 0
  vi.useRealTimers()
  vi.restoreAllMocks()
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeIds.clear()
})

describe('getSessionStudent — a signed-in student', () => {
  it('returns the student document the access token points at', async () => {
    const student = await seedStudent()
    await signIn(student.id as number)

    const session = await getSessionStudent()

    expect(session?.id).toBe(student.id)
    expect(session?.email).toBe(student.email)
    expect(session?.fullName).toBe('Học Viên Test')
  })

  it('reads the live status, not the one stamped into the token at sign-in', async () => {
    const student = await seedStudent()
    await signIn(student.id as number, 'ACTIVE')
    await payload.update({
      collection: 'students',
      id: student.id,
      data: { status: 'DISABLED' },
    })

    expect((await getSessionStudent())?.status).toBe('DISABLED')
  })
})

describe('getSessionStudent — no session', () => {
  it('returns null with no cookie at all', async () => {
    expect(await getSessionStudent()).toBeNull()
  })

  it('returns null for a tampered signature', async () => {
    const student = await seedStudent()
    const token = await signAccessToken({ id: student.id as number, status: 'ACTIVE' })
    const [header, payload, signature] = token.split('.')
    const tamperedSignature = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1)
    ctx.cookieJar.set(ACCESS_COOKIE, `${header}.${payload}.${tamperedSignature}`)

    expect(await getSessionStudent()).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const student = await seedStudent()
    vi.setSystemTime(new Date(Date.now() - 60 * 60 * 1000))
    const stale = await signAccessToken({ id: student.id as number, status: 'ACTIVE' })
    vi.useRealTimers()
    ctx.cookieJar.set(ACCESS_COOKIE, stale)

    expect(await getSessionStudent()).toBeNull()
  })
})

describe('getSessionStudent — a session trouble must not break the page', () => {
  it('returns null when the token is valid but no such student exists', async () => {
    await signIn(2_000_000_000)

    expect(await getSessionStudent()).toBeNull()
  })
})

// `ensureSessionStudent` is the reader for scopes that may write cookies — Route Handlers
// and Server Actions. It is what stops a live session from lapsing once `proxy` no longer
// runs on public pages: `proxy` is the only other place that renews, and a student who
// only browses `/` and `/khoa-hoc` would otherwise be signed out after ACCESS_TTL_SEC
// with a refresh token still good for thirty days.
describe('ensureSessionStudent — renewal', () => {
  it('writes no cookie while the access token is still valid', async () => {
    const student = await seedStudent()
    await signIn(student.id as number)

    const session = await ensureSessionStudent()

    expect(session?.id).toBe(student.id)
    expect(ctx.writes).toEqual([])
    expect(ctx.deletes).toEqual([])
  })

  it('mints a fresh access cookie from the refresh token and answers in the same call', async () => {
    const student = await seedStudent()
    await signInWithRefreshOnly(student.id as number)

    const session = await ensureSessionStudent()

    // The same call, not the next one: `proxy` renews onto the response while its own
    // handler still reads the stale request cookie, so it reports signed-out for one
    // round trip. A reader that renews in-scope has no such gap.
    expect(session?.id).toBe(student.id)
    expect(ctx.writes).toEqual([ACCESS_COOKIE])
    await expect(verifyAccessToken(ctx.cookieJar.get(ACCESS_COOKIE))).resolves.toEqual({
      id: student.id,
      status: 'ACTIVE',
    })
  })

  it('leaves the refresh cookie alone when it renews — the session is not rotated', async () => {
    const student = await seedStudent()
    await signInWithRefreshOnly(student.id as number)
    const before = ctx.cookieJar.get(REFRESH_COOKIE)

    await ensureSessionStudent()

    expect(ctx.cookieJar.get(REFRESH_COOKIE)).toBe(before)
  })

  it('clears both cookies and returns null when the refresh token does not verify', async () => {
    ctx.cookieJar.set(REFRESH_COOKIE, 'not.a.token')

    expect(await ensureSessionStudent()).toBeNull()
    expect(ctx.deletes).toEqual([ACCESS_COOKIE, REFRESH_COOKIE])
    expect(ctx.writes).toEqual([])
  })

  it('touches nothing when there are no cookies at all', async () => {
    expect(await ensureSessionStudent()).toBeNull()
    expect(ctx.writes).toEqual([])
    expect(ctx.deletes).toEqual([])
  })

  it('returns null when the refresh token verifies but the student is gone', async () => {
    await signInWithRefreshOnly(2_000_000_000)

    // The cookie is still minted: the token verified, so the session is real as far as
    // crypto goes. It is the document lookup that fails, and that is the same "nobody to
    // render for" every other failure here reports.
    expect(await ensureSessionStudent()).toBeNull()
    expect(ctx.writes).toEqual([ACCESS_COOKIE])
  })
})

// `/tai-khoan` is a Server Component: `cookies().set()` throws there. Folding these two
// readers into one would compile, pass review, and take the account page down on the first
// request whose access token had lapsed.
describe('getSessionStudent — the read-only contract', () => {
  it('never writes to the cookie jar, even with a valid refresh token sitting there', async () => {
    const student = await seedStudent()
    await signInWithRefreshOnly(student.id as number)

    expect(await getSessionStudent()).toBeNull()
    expect(ctx.writes).toEqual([])
    expect(ctx.deletes).toEqual([])
  })
})
