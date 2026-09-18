import type { CollectionBeforeChangeHook } from 'payload'
import type { Payment } from '@/payload-types'

/**
 * `studentId` is not staff-picked — it is derived from the enrollment being paid for,
 * overriding any value supplied in the request. Mirrors `setRecordedByUser`: only fires on
 * create, since `enrollmentId` itself is read-only and never changes afterward.
 */
export const setStudentFromEnrollment: CollectionBeforeChangeHook<Payment> = async ({
  data,
  operation,
  req,
}) => {
  const enrollmentId =
    typeof data.enrollmentId === 'object' ? data.enrollmentId?.id : data.enrollmentId

  if (operation === 'create' && enrollmentId) {
    const enrollment = await req.payload.findByID({
      collection: 'enrollments',
      id: enrollmentId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    data.studentId = enrollment.student
  }

  return data
}
