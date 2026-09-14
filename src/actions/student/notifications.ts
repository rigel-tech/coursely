'use server'

import { getSessionStudent } from '@/lib/auth/session-student'
import { listAndMarkRecentNotifications } from '@/services/student-notifications'
import type { Notification } from '@/payload-types'

/**
 * The signed-in student's own recent notifications — fetching them marks that batch read
 * (specs/010-notification-bell, FR-005). A signed-out caller gets an empty list, not an
 * error: this is called directly from `<NotificationBell>`, which never expects to be
 * mounted for a signed-out visitor, but must not throw if it somehow is.
 */
export async function listNotificationsAction(): Promise<Notification[]> {
  const student = await getSessionStudent()
  if (!student) return []

  return listAndMarkRecentNotifications(student.id)
}
