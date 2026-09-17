/**
 * Two reusable writes for every notification, whatever raises it — one per target
 * (`student` or a staff `user`), mirroring `src/email/send.ts`'s split: a template
 * (`templates/`) says what the message reads; these say how it gets recorded. A caller
 * supplies its own `title`/`content` (usually from a template) and, for a status/kind
 * that isn't in `Notification['type']` yet, extends that union first — neither function
 * here grows a new wrapper per type.
 */
import type { Notification } from '@/payload-types'
import type { Payload } from 'payload'

type NotificationFields = Pick<Notification, 'content' | 'metadata' | 'title' | 'type'>

export async function createStudentNotification(
  payload: Payload,
  input: NotificationFields & { studentId: number },
): Promise<void> {
  const { content, metadata, studentId, title, type } = input

  await payload.create({
    collection: 'notifications',
    data: { student: studentId, type, title, content, metadata, isRead: false },
    overrideAccess: true,
  })
}

export async function createUserNotification(
  payload: Payload,
  input: NotificationFields & { userId: number },
): Promise<void> {
  const { content, metadata, title, type, userId } = input

  await payload.create({
    collection: 'notifications',
    data: { user: userId, type, title, content, metadata, isRead: false },
    overrideAccess: true,
  })
}
