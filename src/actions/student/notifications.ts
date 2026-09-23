'use server'

import { ensureSessionStudent } from '@/lib/auth/session-student'
import {
  listAndMarkRecentNotifications,
  type NotificationsPage,
} from '@/services/student-notifications'

/**
 * A page of the signed-in student's own recent notifications — fetching a page marks it
 * read (specs/010-notification-bell, FR-005). `page` lets `<NotificationBell>` load further
 * pages on scroll. A signed-out caller gets an empty page, not an error: this is called
 * directly from `<NotificationBell>`, which never expects to be mounted for a signed-out
 * visitor, but must not throw if it somehow is.
 */
export async function listNotificationsAction(page = 1): Promise<NotificationsPage> {
  const student = await ensureSessionStudent()
  if (!student) return { docs: [], hasNextPage: false }

  return listAndMarkRecentNotifications(student.id, { page })
}
