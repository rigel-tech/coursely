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

type CommonFields = {
  content: Notification['content']
  metadata?: Notification['metadata']
  req?: Partial<PayloadRequest>
  title: Notification['title']
  type: Notification['type']
}

/** `audience` says who this notification is for — never inferred from whether `studentId`
 * happens to be there. `'student'` requires it; `'staff'` (shown in the admin bell) has no
 * student to attach. */
export type CreateNotificationInput =
  | (CommonFields & { audience: 'student'; studentId: number })
  | (CommonFields & { audience: 'staff' })

export async function createNotification(
  payload: Payload,
  input: CreateNotificationInput,
): Promise<void> {
  const { content, metadata, req, title, type } = input

  await payload.create({
    collection: 'notifications',
    data: {
      ...(input.audience === 'student' ? { student: input.studentId } : {}),
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
