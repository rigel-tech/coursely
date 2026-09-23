/**
 * The `notifyEnrollmentEvent` task's body: an enrollment lifecycle event — or the class the
 * enrollment was just placed in — as an in-app notification and email to the student and,
 * for a registration or cancellation the student made themselves, to staff as well. Every
 * trigger lives in `Enrollments`' `notifyOnStatusChange` hook; nothing else raises these.
 */
import type { Payload, TypedJobs } from 'payload'

import {
  sendAdminEnrollmentCancelledEmail,
  sendAdminEnrollmentCreatedEmail,
  sendEnrollmentCancellationEmail,
  sendEnrollmentConfirmationEmail,
  sendEnrollmentConfirmedEmail,
} from '@/email/send'
import { attempt } from '@/notifications/attempt'
import { notifyStudentOfClass } from '@/notifications/class-lifecycle'
import { createStaffNotification, createStudentNotification } from '@/notifications/create'
import {
  createAdminEnrollmentCancelledNotificationTemplate,
  createAdminEnrollmentCreatedNotificationTemplate,
  createStudentEnrollmentCancelledNotificationTemplate,
  createStudentEnrollmentConfirmedNotificationTemplate,
  createStudentEnrolledNotificationTemplate,
} from '@/notifications/templates'
import type { AdminEnrollmentEmailInput } from '@/notifications/types'
import type { Course, Student } from '@/payload-types'
import { relationshipId } from '@/utilities/relationshipId'

type EnrollmentEventInput = TypedJobs['tasks']['notifyEnrollmentEvent']['input']
type EnrollmentEvent = Exclude<EnrollmentEventInput['event'], 'CLASS_ASSIGNED'>
type NotificationCopy = { title: string; content: string }

const ENROLLMENT_NOTIFICATION_EVENTS: Record<
  EnrollmentEvent,
  {
    template: (courseTitle: string) => NotificationCopy
    sendEmail: (payload: Payload, input: { to: string; courseTitle: string }) => Promise<void>
    // Staff hear about the events a student causes; the template and the email go together.
    staff?: {
      template: (studentNameOrEmail: string, courseTitle: string) => NotificationCopy
      sendEmail: (payload: Payload, input: AdminEnrollmentEmailInput) => Promise<void>
    }
  }
> = {
  ENROLLMENT_CREATED: {
    template: createStudentEnrolledNotificationTemplate,
    sendEmail: sendEnrollmentConfirmationEmail,
    staff: {
      template: createAdminEnrollmentCreatedNotificationTemplate,
      sendEmail: sendAdminEnrollmentCreatedEmail,
    },
  },
  ENROLLMENT_CANCELLED: {
    template: createStudentEnrollmentCancelledNotificationTemplate,
    sendEmail: sendEnrollmentCancellationEmail,
    staff: {
      template: createAdminEnrollmentCancelledNotificationTemplate,
      sendEmail: sendAdminEnrollmentCancelledEmail,
    },
  },
  ENROLLMENT_CONFIRMED: {
    template: createStudentEnrollmentConfirmedNotificationTemplate,
    sendEmail: sendEnrollmentConfirmedEmail,
  },
}

type EnrollmentRecipients = {
  student: Pick<Student, 'id' | 'email' | 'fullName'>
  course: Pick<Course, 'id' | 'title'>
  notifyStaff: boolean
}

export async function runEnrollmentNotification(
  payload: Payload,
  { enrollmentId, event, notifyStaff }: EnrollmentEventInput,
): Promise<void> {
  const enrollment = await payload.findByID({
    collection: 'enrollments',
    id: enrollmentId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
  })
  const studentId = relationshipId(enrollment?.student)
  const courseId = relationshipId(enrollment?.course)
  if (!enrollment || studentId === null || courseId === null) return

  // Read now, not at queue time: a `fullName` the student entered with this very
  // registration is written just before the enrollment and must be the name staff see.
  const [student, course] = await Promise.all([
    payload.findByID({
      collection: 'students',
      id: studentId,
      depth: 0,
      select: { email: true, fullName: true },
      disableErrors: true,
      overrideAccess: true,
    }),
    payload.findByID({
      collection: 'courses',
      id: courseId,
      depth: 0,
      select: { title: true },
      disableErrors: true,
      overrideAccess: true,
    }),
  ])
  if (!student || !course) return

  if (event === 'CLASS_ASSIGNED') {
    const classId = relationshipId(enrollment.class)
    const classDoc =
      classId === null
        ? null
        : await payload.findByID({
            collection: 'classes',
            id: classId,
            depth: 0,
            disableErrors: true,
            overrideAccess: true,
          })
    if (classDoc) await notifyStudentOfClass(payload, event, { student, course, classDoc })
    return
  }

  await notifyEnrollment(payload, event, { student, course, notifyStaff })
}

async function notifyEnrollment(
  payload: Payload,
  event: EnrollmentEvent,
  { student, course, notifyStaff }: EnrollmentRecipients,
): Promise<void> {
  const { template, sendEmail, staff } = ENROLLMENT_NOTIFICATION_EVENTS[event]

  await attempt(payload, `${event} notification failed`, () =>
    createStudentNotification(payload, {
      studentId: student.id,
      type: event,
      ...template(course.title),
      metadata: { course: course.id },
    }),
  )
  await attempt(payload, `${event} email failed`, () =>
    sendEmail(payload, { to: student.email, courseTitle: course.title }),
  )

  if (!notifyStaff || !staff) return

  const studentNameOrEmail = student.fullName || student.email
  await attempt(payload, `${event} staff notification failed`, () =>
    createStaffNotification(payload, {
      type: event,
      ...staff.template(studentNameOrEmail, course.title),
      metadata: { course: course.id, student: student.id },
    }),
  )
  await attempt(payload, `${event} staff email failed`, async () => {
    const { docs: users } = await payload.find({
      collection: 'users',
      depth: 0,
      pagination: false,
      select: { email: true },
      overrideAccess: true,
    })

    for (const to of new Set(users.map((user) => user.email))) {
      await attempt(payload, `${event} staff email failed`, () =>
        staff.sendEmail(payload, { to, studentNameOrEmail, courseTitle: course.title }),
      )
    }
  })
}
