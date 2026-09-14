// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { countUnreadNotifications } from '@/services/student-notifications'

/**
 * Proves specs/011's FR-003/SC-002 against real Postgres rows and Payload's real query
 * semantics, not just the data-model.md argument that `equals: studentId` can never match
 * a null `student`. Drives the same `where` shapes the admin bell's REST calls and
 * `student-notifications.ts` use, via the Local API `payload.count()` those REST endpoints
 * are themselves backed by (research.md Decision 2) — this does not exercise the actual
 * HTTP/REST hop, which is Payload's own framework code, not this feature's.
 */
let payload: Payload
const madeStudentIds = new Set<number>()
const madeNotificationIds = new Set<number>()

const uniqueEmail = () =>
  `audience-isolation-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async () => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: 'Secret123', status: 'ACTIVE' },
  })
  madeStudentIds.add(student.id)
  return student
}

const seedNotification = async (studentId: number | undefined, isRead: boolean) => {
  const notification = await payload.create({
    collection: 'notifications',
    data: {
      ...(studentId !== undefined ? { student: studentId } : {}),
      type: 'ACCOUNT_CREATED',
      title: 'Test',
      content: 'Test',
      isRead,
    },
    overrideAccess: true,
  })
  madeNotificationIds.add(notification.id)
}

const countStaffFacingUnread = async () =>
  (
    await payload.count({
      collection: 'notifications',
      where: { student: { exists: false }, isRead: { equals: false } },
    })
  ).totalDocs

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const id of madeNotificationIds) {
    await payload.delete({ collection: 'notifications', id }).catch(() => {})
  }
  madeNotificationIds.clear()
  for (const id of madeStudentIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeStudentIds.clear()
})

describe('notification audience isolation (specs/011 FR-003/SC-002)', () => {
  it('a staff-facing count never includes a student-facing row, and vice versa', async () => {
    const student = await seedStudent()
    const before = await countStaffFacingUnread()

    await seedNotification(undefined, false) // staff-facing
    await seedNotification(student.id, false) // this student's own

    expect(await countStaffFacingUnread()).toBe(before + 1)
    expect(await countUnreadNotifications(student.id)).toBe(1)
  })
})
