/**
 * The `notifyPaymentRecorded` task's body: the student's receipt for a newly recorded
 * payment, as an in-app notification and an email.
 */
import type { Payload, TypedJobs } from 'payload'

import { sendPaymentRecordedEmail } from '@/email/send'
import { attempt } from '@/notifications/attempt'
import { createStudentNotification } from '@/notifications/create'
import { createStudentPaymentRecordedNotificationTemplate } from '@/notifications/templates'
import type { PaymentInfo } from '@/notifications/types'
import { relationshipId } from '@/utilities/relationshipId'

export async function runPaymentNotification(
  payload: Payload,
  { paymentId }: TypedJobs['tasks']['notifyPaymentRecorded']['input'],
): Promise<void> {
  const payment = await payload.findByID({
    collection: 'payments',
    id: paymentId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
  })
  const studentId = relationshipId(payment?.studentId)
  const enrollmentId = relationshipId(payment?.enrollmentId)
  if (!payment || studentId === null || enrollmentId === null) return

  const [student, enrollment] = await Promise.all([
    payload.findByID({
      collection: 'students',
      id: studentId,
      depth: 0,
      select: { email: true, fullName: true },
      disableErrors: true,
      overrideAccess: true,
    }),
    payload.findByID({
      collection: 'enrollments',
      id: enrollmentId,
      depth: 1,
      select: { course: true },
      populate: { courses: { title: true } },
      disableErrors: true,
      overrideAccess: true,
    }),
  ])
  const course = enrollment?.course
  // Unpopulated, a relationship is a bare numeric id (INVARIANTS.md) — no title to print.
  if (!student || typeof course !== 'object' || course === null) return

  const receipt: PaymentInfo = {
    courseTitle: course.title,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    referenceNote: payment.referenceNote,
  }

  await attempt(payload, 'PAYMENT_RECORDED notification failed', () =>
    createStudentNotification(payload, {
      studentId: student.id,
      type: 'PAYMENT_RECORDED',
      ...createStudentPaymentRecordedNotificationTemplate(receipt),
      metadata: { course: course.id, payment: payment.id },
    }),
  )
  await attempt(payload, 'PAYMENT_RECORDED email failed', () =>
    sendPaymentRecordedEmail(payload, {
      to: student.email,
      studentNameOrEmail: student.fullName || student.email,
      ...receipt,
    }),
  )
}
