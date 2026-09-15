/**
 * One reusable write for every notification, whatever raises it — admin-triggered flows
 * and student-triggered ones alike. Mirrors `src/email/send.ts`'s split: a template
 * (`templates/`) says what the message reads; this says how it gets recorded. A caller
 * supplies its own `title`/`content` (usually from a template) and, for a status/kind
 * that isn't in `Notification['type']` yet, extends that union first — this function
 * itself never grows a new wrapper per type.
 */
import type { Notification } from '@/payload-types'
import type { Payload, PayloadRequest } from 'payload'

export type CreateNotificationInput = {
  content: Notification['content']
  metadata?: Notification['metadata']
  req?: Partial<PayloadRequest>
  studentId?: number
  title: Notification['title']
  type: Notification['type']
}

export async function createNotification(
  payload: Payload,
  { content, metadata, req, studentId, title, type }: CreateNotificationInput,
): Promise<void> {
  await payload.create({
    collection: 'notifications',
    data: {
      ...(studentId !== undefined ? { student: studentId } : {}),
      type,
      title,
      content,
      metadata,
      isRead: false,
    },
    overrideAccess: true,
    req,
  })
}
