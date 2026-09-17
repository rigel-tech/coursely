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

const { GET } = await import('@/app/(frontend)/next/notifications-count/route')

const ACCESS_COOKIE = 'coursely-access'

const read = async (res: Response) => (await res.json()) as { count: number }

let payload: Payload
const madeStudentIds = new Set<number>()
const madeNotificationIds = new Set<number>()

const uniqueEmail = () =>
  `notif-count-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async () => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: 'Secret123', status: 'ACTIVE' },
  })
  madeStudentIds.add(student.id)
  return student
}

const seedNotification = async (studentId: number, isRead: boolean) => {
  const notification = await payload.create({
    collection: 'notifications',
    data: {
      student: studentId,
      type: 'ACCOUNT_CREATED',
      title: 'Test',
      content: 'Test',
      isRead,
    },
    overrideAccess: true,
  })
  madeNotificationIds.add(notification.id)
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  ctx.cookieJar.clear()
  for (const id of madeNotificationIds) {
    await payload.delete({ collection: 'notifications', id }).catch(() => {})
  }
  madeNotificationIds.clear()
  for (const id of madeStudentIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeStudentIds.clear()
})

describe('GET /next/notifications-count', () => {
  it('counts only the signed-in student’s unread notifications', async () => {
    const student = await seedStudent()
    const otherStudent = await seedStudent()
    await seedNotification(student.id, false)
    await seedNotification(student.id, false)
    await seedNotification(student.id, true)
    await seedNotification(otherStudent.id, false)
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: student.id }))

    expect(await read(await GET())).toEqual({ count: 2 })
  })

  it('reports zero when there is no session cookie', async () => {
    expect(await read(await GET())).toEqual({ count: 0 })
  })

  it('reports zero for a token naming a student that no longer exists', async () => {
    ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: 2_000_000_000 }))

    expect(await read(await GET())).toEqual({ count: 0 })
  })
})
