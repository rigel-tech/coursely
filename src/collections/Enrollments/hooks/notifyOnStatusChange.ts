import type { CollectionAfterChangeHook } from 'payload'
import { notifyEnrollment } from '@/notifications/enrollment'
import type { Course, Student } from '@/payload-types'

export const notifyOnStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  if (
    operation === 'update' &&
    previousDoc?.enrollmentStatus !== 'CONFIRMED' &&
    doc.enrollmentStatus === 'CONFIRMED'
  ) {
    const studentId =
      typeof doc.student === 'object' && doc.student !== null ? doc.student.id : doc.student
    const courseId =
      typeof doc.course === 'object' && doc.course !== null ? doc.course.id : doc.course

    const [student, course] = await Promise.all([
      studentId
        ? req.payload.findByID({
            collection: 'students',
            id: studentId,
            depth: 0,
            overrideAccess: true,
          })
        : null,
      courseId
        ? req.payload.findByID({
            collection: 'courses',
            id: courseId,
            depth: 0,
            overrideAccess: true,
          })
        : null,
    ])

    if (student && course) {
      notifyEnrollment({
        payload: req.payload,
        event: 'ENROLLMENT_CONFIRMED',
        student: student as Student,
        course: course as Course,
      })
    }
  }

  return doc
}
