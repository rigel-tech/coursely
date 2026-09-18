/**
 * The in-app notification + confirmation email pair for an enrollment lifecycle event —
 * shared by every caller that raises one (registration, self-cancellation, and future
 * admin-driven changes), so the fire-and-forget + log-on-failure shape is written once.
 */
import type { Payload } from 'payload'

import { sendEnrollmentCancellationEmail, sendEnrollmentConfirmationEmail } from '@/email/send'
import { createStudentNotification } from '@/notifications/create'
import { createStudentEnrolledNotificationTemplate } from '@/notifications/templates/enrollment-created'
import { createStudentEnrollmentCancelledNotificationTemplate } from '@/notifications/templates/enrollment-cancelled'
import type { Course, Student } from '@/payload-types'

type EnrollmentNotificationEvent = 'ENROLLMENT_CREATED' | 'ENROLLMENT_CANCELLED'

type NotifyEnrollmentInput = {
  payload: Payload
  event: EnrollmentNotificationEvent
  student: Pick<Student, 'id' | 'email'>
  course: Course
}

const ENROLLMENT_NOTIFICATION_EVENTS: Record<
  EnrollmentNotificationEvent,
  {
    template: (courseTitle: string) => { title: string; content: string }
    sendEmail: (payload: Payload, input: { to: string; courseTitle: string }) => Promise<void>
  }
> = {
  ENROLLMENT_CREATED: {
    template: createStudentEnrolledNotificationTemplate,
    sendEmail: sendEnrollmentConfirmationEmail,
  },
  ENROLLMENT_CANCELLED: {
    template: createStudentEnrollmentCancelledNotificationTemplate,
    sendEmail: sendEnrollmentCancellationEmail,
  },
}

export function notifyEnrollment({ payload, event, student, course }: NotifyEnrollmentInput): void {
  const { template, sendEmail } = ENROLLMENT_NOTIFICATION_EVENTS[event]
  const { title, content } = template(course.title)

  void createStudentNotification(payload, {
    studentId: student.id,
    type: event,
    title,
    content,
    metadata: { course: course.id },
  }).catch((err) => payload.logger.error({ err }, `${event} notification failed`))

  void sendEmail(payload, { to: student.email, courseTitle: course.title }).catch((err) =>
    payload.logger.error({ err }, `${event} email failed`),
  )
}
