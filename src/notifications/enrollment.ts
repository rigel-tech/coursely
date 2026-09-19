/**
 * The in-app notification + confirmation email pair for an enrollment lifecycle event —
 * shared by every caller that raises one (registration, self-cancellation, and future
 * admin-driven changes), so the fire-and-forget + log-on-failure shape is written once.
 */
import type { Payload } from 'payload'

import {
  sendAdminEnrollmentCancelledEmail,
  sendAdminEnrollmentCreatedEmail,
  sendEnrollmentCancellationEmail,
  sendEnrollmentConfirmationEmail,
  sendEnrollmentConfirmedEmail,
} from '@/email/send'
import { createStaffNotification, createStudentNotification } from '@/notifications/create'
import { createAdminEnrollmentCancelledNotificationTemplate } from '@/notifications/templates/admin-enrollment-cancelled'
import { createAdminEnrollmentCreatedNotificationTemplate } from '@/notifications/templates/admin-enrollment-created'
import { createStudentEnrollmentCancelledNotificationTemplate } from '@/notifications/templates/enrollment-cancelled'
import { createStudentEnrollmentConfirmedNotificationTemplate } from '@/notifications/templates/enrollment-confirmed'
import { createStudentEnrolledNotificationTemplate } from '@/notifications/templates/enrollment-created'
import type { Course, Student } from '@/payload-types'

type EnrollmentNotificationEvent =
  'ENROLLMENT_CREATED' | 'ENROLLMENT_CANCELLED' | 'ENROLLMENT_CONFIRMED'

type NotifyEnrollmentInput = {
  payload: Payload
  event: EnrollmentNotificationEvent
  student: Pick<Student, 'id' | 'email'> & { fullName?: string | null }
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
  ENROLLMENT_CONFIRMED: {
    template: createStudentEnrollmentConfirmedNotificationTemplate,
    sendEmail: sendEnrollmentConfirmedEmail,
  },
}

export function notifyEnrollment({ payload, event, student, course }: NotifyEnrollmentInput): void {
  // 1. Gửi thông báo & Email cho Học viên
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

  const studentIdentifier = student.fullName || student.email
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL

  if (event === 'ENROLLMENT_CREATED') {
    const adminTpl = createAdminEnrollmentCreatedNotificationTemplate(
      studentIdentifier,
      course.title,
    )

    void createStaffNotification(payload, {
      type: event,
      title: adminTpl.title,
      content: adminTpl.content,
      metadata: { course: course.id, student: student.id },
    }).catch((err) => payload.logger.error({ err }, `${event} admin notification failed`))

    if (adminEmail) {
      void sendAdminEnrollmentCreatedEmail(payload, {
        to: adminEmail,
        studentNameOrEmail: studentIdentifier,
        courseTitle: course.title,
      }).catch((err) => payload.logger.error({ err }, `${event} admin email failed`))
    }
  } else if (event === 'ENROLLMENT_CANCELLED') {
    const adminTpl = createAdminEnrollmentCancelledNotificationTemplate(
      studentIdentifier,
      course.title,
    )

    void createStaffNotification(payload, {
      type: event,
      title: adminTpl.title,
      content: adminTpl.content,
      metadata: { course: course.id, student: student.id },
    }).catch((err) => payload.logger.error({ err }, `${event} admin notification failed`))

    if (adminEmail) {
      void sendAdminEnrollmentCancelledEmail(payload, {
        to: adminEmail,
        studentNameOrEmail: studentIdentifier,
        courseTitle: course.title,
      }).catch((err) => payload.logger.error({ err }, `${event} admin email failed`))
    }
  }
}
