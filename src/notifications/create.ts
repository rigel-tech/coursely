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

async function createNotification(
  payload: Payload,
  data: Partial<Notification> & NotificationFields,
): Promise<void> {
  await payload.create({
    collection: 'notifications',
    data: { isRead: false, ...data },
    overrideAccess: true,
  })
}

export async function createStudentNotification(
  payload: Payload,
  { studentId, ...input }: NotificationFields & { studentId: number },
): Promise<void> {
  await createNotification(payload, { student: studentId, ...input })
}

export async function createStaffNotification(
  payload: Payload,
  input: NotificationFields,
): Promise<void> {
  await createNotification(payload, input)
}
