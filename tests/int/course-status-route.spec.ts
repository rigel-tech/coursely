// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
//
// This route exists so `/khoa-hoc/:slug` can stop reading the session on the server. That
// page was the one documented exception to "auth-dependent public UI resolves signed-in
// state client-side", and the exception was what kept it on `force-dynamic`.
//
// It answers with the student's own profile — email, name, phone — so the anonymous case is
// a leak test, not a formatting test.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { signAccessToken, signRefreshToken } from '@/lib/auth/session-token'
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

const { GET } = await import('@/app/(frontend)/next/course-status/route')

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

type Body = {
  authenticated: boolean
  profile?: { email?: string; fullName?: string; phone?: string }
  enrollment?: { id: number; enrollmentStatus: string; canCancel: boolean }
}

const req = (query: string) => new Request(`http://localhost/next/course-status${query}`)
const read = async (res: Response) => (await res.json()) as Body

let payload: Payload
const madeStudents = new Set<number>()
const madeEnrollments = new Set<number>()
let courseId: number
let otherCourseId: number

const unique = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}`

const seedStudent = async () => {
  const student = await payload.create({
    collection: 'students',
    data: {
      email: `${unique('course-status')}@example.com`,
      password: 'Secret123',
      fullName: 'Nguyễn Văn Học',
      phone: '0912345678',
      status: 'ACTIVE',
    },
  })
  madeStudents.add(student.id as number)
  return student
}

const seedCourse = async () => {
  const course = await payload.create({
    collection: 'courses',
    data: { title: unique('Khoá'), slug: unique('khoa'), _status: 'published' },
  } as Parameters<Payload['create']>[0])
  return (course as { id: number }).id
}

const enrol = async (studentId: number, course: number) => {
  const enrollment = await payload.create({
    collection: 'enrollments',
    data: { student: studentId, course, enrollmentStatus: 'NEW', paymentStatus: 'UNPAID' },
    overrideAccess: true,
  } as Parameters<Payload['create']>[0])
  madeEnrollments.add((enrollment as { id: number }).id)
  return enrollment as { id: number }
}

const signIn = async (id: number) => {
  ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id, status: 'ACTIVE' }))
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
  courseId = await seedCourse()
  otherCourseId = await seedCourse()
})

afterEach(async () => {
  ctx.cookieJar.clear()
  ctx.writes.length = 0
  ctx.deletes.length = 0
  for (const id of madeEnrollments) {
    await payload.delete({ collection: 'enrollments', id }).catch(() => {})
  }
  madeEnrollments.clear()
  for (const id of madeStudents) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeStudents.clear()
})

describe('GET /next/course-status — a signed-in student', () => {
  it('reports the active enrollment and the profile the form prefills from', async () => {
    const student = await seedStudent()
    const enrollment = await enrol(student.id as number, courseId)
    await signIn(student.id as number)

    const body = await read(await GET(req(`?courseId=${courseId}`)))

    expect(body.authenticated).toBe(true)
    expect(body.profile).toEqual({
      email: student.email,
      fullName: 'Nguyễn Văn Học',
      phone: '0912345678',
    })
    expect(body.enrollment).toEqual({
      id: enrollment.id,
      enrollmentStatus: 'NEW',
      canCancel: true,
    })
  })

  it('reports the profile but no enrollment for a course they have not joined', async () => {
    const student = await seedStudent()
    await enrol(student.id as number, otherCourseId)
    await signIn(student.id as number)

    const body = await read(await GET(req(`?courseId=${courseId}`)))

    expect(body.authenticated).toBe(true)
    expect(body.profile?.email).toBe(student.email)
    expect(body.enrollment).toBeUndefined()
  })
})

describe('GET /next/course-status — an anonymous visitor', () => {
  it('reports nothing about anybody', async () => {
    const body = await read(await GET(req(`?courseId=${courseId}`)))

    expect(body.authenticated).toBe(false)
    expect(body.profile).toBeUndefined()
    expect(body.enrollment).toBeUndefined()
  })

  it('reports nothing even when that course has enrollments on it', async () => {
    const student = await seedStudent()
    await enrol(student.id as number, courseId)

    const body = await read(await GET(req(`?courseId=${courseId}`)))

    expect(body).toEqual({ authenticated: false })
  })
})

describe('GET /next/course-status — session renewal and caching', () => {
  it('renews from the refresh token and answers in the same response', async () => {
    const student = await seedStudent()
    await enrol(student.id as number, courseId)
    ctx.cookieJar.set(
      REFRESH_COOKIE,
      await signRefreshToken({ id: student.id as number, status: 'ACTIVE' }, REFRESH_TTL_SEC),
    )

    const body = await read(await GET(req(`?courseId=${courseId}`)))

    expect(body.authenticated).toBe(true)
    expect(ctx.writes).toEqual([ACCESS_COOKIE])
  })

  it.each([
    ['a signed-in student', true],
    ['an anonymous visitor', false],
  ])('sends private, no-store for %s', async (_label, authenticated) => {
    if (authenticated) {
      const student = await seedStudent()
      await signIn(student.id as number)
    }

    const res = await GET(req(`?courseId=${courseId}`))

    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })
})

// `courseId` arrives on the query string, so it is whatever the browser chose to send.
describe('GET /next/course-status — courseId is client input', () => {
  it.each(['', '?courseId=', '?courseId=abc', '?courseId=1.5', '?courseId=-3'])(
    'refuses %s rather than answering about some other course',
    async (query) => {
      const student = await seedStudent()
      await enrol(student.id as number, courseId)
      await signIn(student.id as number)

      const res = await GET(req(query))

      expect(res.status).toBe(400)
      expect((await read(res)).enrollment).toBeUndefined()
    },
  )
})
