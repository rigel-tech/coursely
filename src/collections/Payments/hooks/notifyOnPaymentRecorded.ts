import type { CollectionAfterChangeHook } from 'payload'
import { notifyPaymentRecorded } from '@/notifications/payment-recorded'
import { relationshipId } from '@/utilities/relationshipId'
import type { Course, Enrollment, Payment, Student } from '@/payload-types'

export const notifyOnPaymentRecorded: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'create') return doc

  const studentId = relationshipId(doc.studentId)
  const enrollmentId = relationshipId(doc.enrollmentId)

  if (!studentId || !enrollmentId) return doc

  const [student, enrollment] = await Promise.all([
    req.payload.findByID({
      collection: 'students',
      id: studentId,
      depth: 0,
      overrideAccess: true,
    }),
    req.payload.findByID({
      collection: 'enrollments',
      id: enrollmentId,
      depth: 1,
      overrideAccess: true,
    }),
  ])

  const course = (enrollment as Enrollment)?.course as Course

  if (student && course) {
    notifyPaymentRecorded({
      payload: req.payload,
      student: student as Student,
      course,
      payment: doc as Payment,
    })
  }

  return doc
}
