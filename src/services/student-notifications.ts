/**
 * Reads a student's own notifications. `Notifications.access` stays staff-only
 * (`src/access/authenticated.ts`) — every function here takes an already-resolved
 * `studentId` and scopes its own query by it with `overrideAccess: true`, the same shape
 * `findCourseSlug` / `updateStudentProfile` already use. See INVARIANTS.md: this is the
 * only sanctioned way a student reads their own notifications — never by widening the
 * collection's own access.
 */

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { Notification } from '@/payload-types'

const RECENT_LIMIT = 20

export async function countUnreadNotifications(studentId: number): Promise<number> {
  const payload = await getPayload({ config: configPromise })

  const { totalDocs } = await payload.count({
    collection: 'notifications',
    where: { and: [{ student: { equals: studentId } }, { isRead: { equals: false } }] },
    overrideAccess: true,
  })

  return totalDocs
}

export type NotificationsPage = { docs: Notification[]; hasNextPage: boolean }

/**
 * A page of this student's notifications, most recent first, marking exactly the returned
 * batch as read — never every unread one. A student with more than `RECENT_LIMIT` unread
 * notifications still has some unread after viewing; only what was actually shown is
 * marked (specs/010-notification-bell, FR-005). `page` lets the bell load further pages on
 * scroll instead of being capped at the first `RECENT_LIMIT`.
 */
export async function listAndMarkRecentNotifications(
  studentId: number,
  { page = 1 }: { page?: number } = {},
): Promise<NotificationsPage> {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'notifications',
    where: { student: { equals: studentId } },
    sort: '-createdAt',
    limit: RECENT_LIMIT,
    page,
    depth: 0,
    overrideAccess: true,
  })

  const ids = result.docs.map((doc) => doc.id)
  if (ids.length > 0) {
    await payload.update({
      collection: 'notifications',
      // `isRead: { equals: false }` alongside the id list — some of these 20 may already
      // be read, and rewriting them again would only bump `updatedAt` for nothing.
      where: { and: [{ id: { in: ids } }, { isRead: { equals: false } }] },
      data: { isRead: true },
      depth: 0,
      overrideAccess: true,
    })
  }

  return { docs: result.docs, hasNextPage: result.hasNextPage }
}
