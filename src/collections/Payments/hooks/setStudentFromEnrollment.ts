import type { CollectionBeforeChangeHook } from 'payload'

/**
 * `studentId` is not staff-picked — it is derived from the enrollment being paid for,
 * overriding any value supplied in the request. Mirrors `setRecordedByUser`: only fires on
 * create, since `enrollmentId` itself is read-only and never changes afterward.
 */
export const setStudentFromEnrollment: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation === 'create' && data.enrollmentId) {
    const enrollment = await req.payload.findByID({
      collection: 'enrollments',
      id: data.enrollmentId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    data.studentId = enrollment.student
  }

  return data
}
