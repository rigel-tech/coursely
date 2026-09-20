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
import {
  createAdminEnrollmentCancelledNotificationTemplate,
  createAdminEnrollmentCreatedNotificationTemplate,
  createStudentEnrollmentCancelledNotificationTemplate,
  createStudentEnrollmentConfirmedNotificationTemplate,
  createStudentEnrolledNotificationTemplate,
} from '@/notifications/templates'
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
    adminTemplate?: (
      studentNameOrEmail: string,
      courseTitle: string,
    ) => { title: string; content: string }
    sendAdminEmail?: (
      payload: Payload,
      input: { to: string; studentNameOrEmail: string; courseTitle: string },
    ) => Promise<void>
  }
> = {
  ENROLLMENT_CREATED: {
    template: createStudentEnrolledNotificationTemplate,
    sendEmail: sendEnrollmentConfirmationEmail,
    adminTemplate: createAdminEnrollmentCreatedNotificationTemplate,
    sendAdminEmail: sendAdminEnrollmentCreatedEmail,
  },
  ENROLLMENT_CANCELLED: {
    template: createStudentEnrollmentCancelledNotificationTemplate,
    sendEmail: sendEnrollmentCancellationEmail,
    adminTemplate: createAdminEnrollmentCancelledNotificationTemplate,
    sendAdminEmail: sendAdminEnrollmentCancelledEmail,
  },
  ENROLLMENT_CONFIRMED: {
    template: createStudentEnrollmentConfirmedNotificationTemplate,
    sendEmail: sendEnrollmentConfirmedEmail,
  },
}

export function notifyEnrollment({ payload, event, student, course }: NotifyEnrollmentInput): void {
  const config = ENROLLMENT_NOTIFICATION_EVENTS[event]

  const { title, content } = config.template(course.title)

  void createStudentNotification(payload, {
    studentId: student.id,
    type: event,
    title,
    content,
    metadata: { course: course.id },
  }).catch((err) => payload.logger.error({ err }, `${event} notification failed`))

  void config
    .sendEmail(payload, { to: student.email, courseTitle: course.title })
    .catch((err) => payload.logger.error({ err }, `${event} email failed`))

  if (config.adminTemplate) {
    const studentIdentifier = student.fullName || student.email
    const adminTpl = config.adminTemplate(studentIdentifier, course.title)

    void createStaffNotification(payload, {
      type: event,
      title: adminTpl.title,
      content: adminTpl.content,
      metadata: { course: course.id, student: student.id },
    }).catch((err) => payload.logger.error({ err }, `${event} admin notification failed`))

    if (config.sendAdminEmail) {
      void sendAdminEmails(payload, config.sendAdminEmail, {
        studentNameOrEmail: studentIdentifier,
        courseTitle: course.title,
      }).catch((err) => payload.logger.error({ err }, `${event} admin email failed`))
    }
  }
}

async function sendAdminEmails(
  payload: Payload,
  sendEmail: (
    payload: Payload,
    input: { to: string; studentNameOrEmail: string; courseTitle: string },
  ) => Promise<void>,
  input: { studentNameOrEmail: string; courseTitle: string },
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'users',
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { email: true },
  })

  const emails = [...new Set(docs.map((u) => u.email).filter(Boolean))]

  if (emails.length === 0) return

  await Promise.all(
    emails.map((to) =>
      sendEmail(payload, { to, ...input }).catch((err) =>
        payload.logger.error({ err }, `Admin email to ${to} failed`),
      ),
    ),
  )
}
