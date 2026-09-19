import { getPayload, type PayloadRequest } from 'payload'
import configPromise from '@payload-config'

import { ClassCourseMismatch, ClassFull, EnrollmentNotAssignable } from '@/lib/errors/enrollment'
import { countClassOccupancy, lockClassSeats } from '@/services/class-seats'
import { relationshipId } from '@/utilities/relationshipId'

const isAssignable = (enrollment: { class?: unknown; enrollmentStatus?: unknown }) =>
  enrollment.enrollmentStatus === 'CONFIRMED' && !relationshipId(enrollment.class)

export const assignStudentsToClass = async (
  classId: number,
  enrollmentIds: number[],
): Promise<void> => {
  const payload = await getPayload({ config: configPromise })
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req = { payload, transactionID } as PayloadRequest

  try {
    await lockClassSeats(classId, req)

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

    const taken = await countClassOccupancy(classId, req)
    const remaining = classDoc.maxStudents - taken
    if (enrollmentIds.length > remaining) throw new ClassFull({ remaining })

    await Promise.all(
      enrollments.map((enrollment) =>
        payload.update({
          collection: 'enrollments',
          id: enrollment.id,
          data: { class: classId },
          overrideAccess: true,
          req,
        }),
      ),
    )

    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
