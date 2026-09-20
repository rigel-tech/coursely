import type { CollectionAfterChangeHook } from 'payload'
import { notifyEnrollment } from '@/notifications/enrollment'
import { notifyClassAssigned } from '@/notifications/class-assigned'
import { relationshipId } from '@/utilities/relationshipId'
import type { Class, Course, Student } from '@/payload-types'

export const notifyOnStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const currentClassId = relationshipId(doc.class)
  const previousClassId = relationshipId(previousDoc?.class)
  const isStatusConfirmedNow =
    operation === 'update' &&
    previousDoc?.enrollmentStatus !== 'CONFIRMED' &&
    doc.enrollmentStatus === 'CONFIRMED'

  const isClassAssignedNow = Boolean(
    currentClassId && (!previousClassId || currentClassId !== previousClassId),
  )

  if (!isStatusConfirmedNow && !isClassAssignedNow) {
    return doc
  }

  const studentId = relationshipId(doc.student)
  const courseId = relationshipId(doc.course)

  const [student, course, classDoc] = await Promise.all([
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
    isClassAssignedNow && currentClassId
      ? req.payload.findByID({
          collection: 'classes',
          id: currentClassId,
          depth: 0,
          overrideAccess: true,
        })
      : null,
  ])

  if (isStatusConfirmedNow && student && course) {
    notifyEnrollment({
      payload: req.payload,
      event: 'ENROLLMENT_CONFIRMED',
      student: student as Student,
      course: course as Course,
    })
  }

  if (isClassAssignedNow && student && course && classDoc) {
    notifyClassAssigned({
      payload: req.payload,
      student: student as Student,
      course: course as Course,
      classDoc: classDoc as Class,
    })
  }

  return doc
}
