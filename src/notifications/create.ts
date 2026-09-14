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
  studentId: number
  title: Notification['title']
  type: Notification['type']
}

export async function createNotification(
  payload: Payload,
  input: CreateNotificationInput,
  req?: Partial<PayloadRequest>,
): Promise<void> {
  await payload.create({
    collection: 'notifications',
    data: {
      student: input.studentId,
      type: input.type,
      title: input.title,
      content: input.content,
      metadata: input.metadata,
      isRead: false,
    },
    overrideAccess: true,
    req,
  })
}
