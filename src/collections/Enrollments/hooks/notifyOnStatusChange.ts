/**
 * Decides which notifications an enrollment save raises and queues them (`queue.ts`); it
 * sends nothing itself. Every enrollment transition is raised here, whoever made it — the
 * student-facing services no longer notify on their own, so a staff edit in `/admin` is
 * covered too. `notifyStaff` is off when a staff member made the change: they already know.
 *
 * - created `NEW` → `ENROLLMENT_CREATED`; created already `CONFIRMED` → `ENROLLMENT_CONFIRMED`
 * - `NEW` → `CONFIRMED` → `ENROLLMENT_CONFIRMED` (not a correction back from `ATTENDED`, nor a
 *   restore from `CANCELLED`)
 * - into `CANCELLED` → `ENROLLMENT_CANCELLED`
 * - a new or different class on a `NOTIFIABLE_ENROLLMENT_STATUSES` enrollment →
 *   `CLASS_ASSIGNED`, unless that class is still a `DRAFT`
 */
import type { CollectionAfterChangeHook, PayloadRequest, TypedJobs } from 'payload'

import { NOTIFIABLE_ENROLLMENT_STATUSES } from '@/notifications/class-lifecycle'
import { queueNotification } from '@/notifications/queue'
import type { Enrollment } from '@/payload-types'
import { relationshipId } from '@/utilities/relationshipId'

type EnrollmentEvent = TypedJobs['tasks']['notifyEnrollmentEvent']['input']['event']

export const notifyOnStatusChange: CollectionAfterChangeHook<Enrollment> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const events: EnrollmentEvent[] = []

  if (operation === 'create') {
    if (doc.enrollmentStatus === 'NEW') events.push('ENROLLMENT_CREATED')
    if (doc.enrollmentStatus === 'CONFIRMED') events.push('ENROLLMENT_CONFIRMED')
  } else {
    // `previousDoc` is only a real document on update — Payload passes `{}` on create.
    if (previousDoc.enrollmentStatus === 'NEW' && doc.enrollmentStatus === 'CONFIRMED') {
      events.push('ENROLLMENT_CONFIRMED')
    }
    if (previousDoc.enrollmentStatus !== 'CANCELLED' && doc.enrollmentStatus === 'CANCELLED') {
      events.push('ENROLLMENT_CANCELLED')
    }
  }

  if (await isClassAssignedNow(doc, previousDoc, req)) events.push('CLASS_ASSIGNED')

  const notifyStaff = req.user?.collection !== 'users'
  for (const event of events) {
    await queueNotification(req, {
      task: 'notifyEnrollmentEvent',
      input: { enrollmentId: doc.id, event, notifyStaff },
    })
  }

  return doc
}

async function isClassAssignedNow(
  doc: Enrollment,
  previousDoc: Enrollment,
  req: PayloadRequest,
): Promise<boolean> {
  const classId = relationshipId(doc.class)
  if (classId === null || classId === relationshipId(previousDoc.class)) return false
  if (!NOTIFIABLE_ENROLLMENT_STATUSES.includes(doc.enrollmentStatus)) return false

  // Read inside the write's own transaction, so a class opened in the same batch counts.
  const assigned = await req.payload.findByID({
    collection: 'classes',
    id: classId,
    depth: 0,
    select: { status: true },
    disableErrors: true,
    overrideAccess: true,
    req,
  })

  return assigned !== null && assigned.status !== 'DRAFT'
}
