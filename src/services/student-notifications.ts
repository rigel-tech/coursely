/**
 * Reads a student's own notifications. `Notifications.access` stays staff-only
 * (`src/access/authenticated.ts`) — every function here takes an already-resolved
 * `studentId` and scopes its own query by it with `overrideAccess: true`, the same shape
 * `findCourseSlug` / `ensureCompleteProfile` already use. See INVARIANTS.md: this is the
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

/**
 * The most recent notifications for this student, marking exactly the returned batch as
 * read — never every unread one. A student with more than `RECENT_LIMIT` unread
 * notifications still has some unread after viewing; only what was actually shown is
 * marked (specs/010-notification-bell, FR-005).
 */
export async function listAndMarkRecentNotifications(studentId: number): Promise<Notification[]> {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'notifications',
    where: { student: { equals: studentId } },
    sort: '-createdAt',
    limit: RECENT_LIMIT,
    overrideAccess: true,
  })

  const ids = result.docs.map((doc) => doc.id)
  if (ids.length > 0) {
    await payload.update({
      collection: 'notifications',
      where: { id: { in: ids } },
      data: { isRead: true },
      overrideAccess: true,
    })
  }

  return result.docs
}
