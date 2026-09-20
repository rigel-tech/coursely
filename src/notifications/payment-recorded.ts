import type { Payload } from 'payload'
import { sendPaymentRecordedEmail } from '@/email/send'
import { createStudentNotification } from '@/notifications/create'
import { createStudentPaymentRecordedNotificationTemplate } from '@/notifications/templates'
import type { Course, Payment, Student } from '@/payload-types'
import type { PaymentInfo } from './types'

export interface NotifyPaymentRecordedInput {
  payload: Payload
  student: Pick<Student, 'id' | 'email'> & { fullName?: string | null }
  course: Pick<Course, 'id' | 'title'>
  payment: Pick<Payment, 'id' | 'amount' | 'paymentMethod' | 'paymentDate' | 'referenceNote'>
}

export function notifyPaymentRecorded({
  payload,
  student,
  course,
  payment,
}: NotifyPaymentRecordedInput): void {
  const paymentInfo: PaymentInfo = {
    courseTitle: course.title,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    referenceNote: payment.referenceNote,
  }

  const { title, content } = createStudentPaymentRecordedNotificationTemplate(paymentInfo)

  void createStudentNotification(payload, {
    studentId: student.id,
    type: 'PAYMENT_RECORDED',
    title,
    content,
    metadata: { course: course.id, payment: payment.id },
  }).catch((err) => payload.logger.error({ err }, 'PAYMENT_RECORDED notification failed'))

  void sendPaymentRecordedEmail(payload, {
    to: student.email,
    studentNameOrEmail: student.fullName || student.email,
    ...paymentInfo,
  }).catch((err) => payload.logger.error({ err }, 'PAYMENT_RECORDED email failed'))
}
