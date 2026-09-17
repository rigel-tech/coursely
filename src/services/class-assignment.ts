/**
 * Batch-assigns enrollments to a class in one transaction: either every enrollment in the
 * batch ends up in the class, or none does. Payload's own bulk update does not give this —
 * it runs each document's update independently and collects per-document errors instead of
 * rolling the batch back (`payload/dist/collections/operations/update.js`) — so a batch this
 * size needs its own transaction, following the same open/commit/rollback shape
 * `src/services/student-profile.ts`'s `updateStudentProfileWithAvatar` already uses.
 *
 * Capacity is still checked once for the whole batch before anything is written, on top of
 * the per-document `guardClassCapacity` hook that also runs on each individual `update` below
 * — the hook is the invariant that holds regardless of caller, this pre-check is what turns a
 * partial failure into "nobody was assigned".
 */
import { getPayload, type PayloadRequest } from 'payload'
import configPromise from '@payload-config'

import { ClassCourseMismatch, ClassFull, EnrollmentNotAssignable } from '@/lib/errors/enrollment'
import { countClassOccupancy, lockClassSeats } from '@/services/class-seats'
import { relationshipId } from '@/utilities/relationshipId'

const isAssignable = (enrollment: { class?: unknown; enrollmentStatus?: unknown }) =>
  enrollment.enrollmentStatus === 'CONFIRMED' && !relationshipId(enrollment.class)

export const assignStudentsToClass = async ({
  classId,
  enrollmentIds,
}: {
  classId: number
  enrollmentIds: number[]
}): Promise<void> => {
  const payload = await getPayload({ config: configPromise })
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req = { payload, transactionID } as PayloadRequest

  try {
    await lockClassSeats({ classId, req })

    const classDoc = await payload.findByID({
      collection: 'classes',
      id: classId,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const { docs: enrollments } = await payload.find({
      collection: 'enrollments',
      where: { id: { in: enrollmentIds } },
      depth: 0,
      limit: enrollmentIds.length,
      overrideAccess: true,
      req,
    })

    if (enrollments.length !== enrollmentIds.length) throw new EnrollmentNotAssignable()

    const wrongCourse = enrollments.find(
      (enrollment) => relationshipId(enrollment.course) !== relationshipId(classDoc.course),
    )
    if (wrongCourse) throw new ClassCourseMismatch()

    const notAssignable = enrollments.find((enrollment) => !isAssignable(enrollment))
    if (notAssignable) throw new EnrollmentNotAssignable()

    const taken = await countClassOccupancy({ classId, req })
    const remaining = classDoc.maxStudents - taken
    if (enrollmentIds.length > remaining) throw new ClassFull({ remaining })

    for (const enrollment of enrollments) {
      await payload.update({
        collection: 'enrollments',
        id: enrollment.id,
        data: { class: classId },
        overrideAccess: true,
        req,
      })
    }

    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
