/**
 * Decides which notification a class save raises and queues it (`queue.ts`); it sends
 * nothing itself. A `DRAFT` class is silent — the student page hides it — so a class leaving
 * `DRAFT` for `OPEN`/`CLOSED` is when the students already placed in it first hear about it
 * (`CLASS_ASSIGNED`, to the whole class). After that: into `CANCELLED` → `CLASS_CANCELLED`,
 * and a changed `SCHEDULE_FIELDS` value → `CLASS_RESCHEDULED`.
 */
import type { CollectionAfterChangeHook, TypedJobs } from 'payload'

import { queueNotification } from '@/notifications/queue'
import type { Class } from '@/payload-types'

type ClassEvent = TypedJobs['tasks']['notifyClassEvent']['input']['event']

const SCHEDULE_FIELDS = [
  'startDate',
  'endDate',
  'scheduleTime',
  'location',
] as const satisfies readonly (keyof Class)[]

export const notifyOnClassChange: CollectionAfterChangeHook<Class> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return doc

  const event = classEvent(previousDoc, doc)
  if (event) {
    await queueNotification(req, { task: 'notifyClassEvent', input: { classId: doc.id, event } })
  }

  return doc
}

function classEvent(previous: Class, next: Class): ClassEvent | null {
  if (previous.status === 'DRAFT') {
    return next.status === 'OPEN' || next.status === 'CLOSED' ? 'CLASS_ASSIGNED' : null
  }
  if (next.status === 'DRAFT') return null
  if (next.status === 'CANCELLED') {
    return previous.status === 'CANCELLED' ? null : 'CLASS_CANCELLED'
  }

  return SCHEDULE_FIELDS.some((field) => next[field] !== previous[field])
    ? 'CLASS_RESCHEDULED'
    : null
}
