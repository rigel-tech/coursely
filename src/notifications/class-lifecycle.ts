/**
 * Notifications about a student's class: being placed in one (`CLASS_ASSIGNED`), and that
 * class being rescheduled or cancelled. `runClassNotification` is the `notifyClassEvent`
 * task's body; it fans one class event out to the students in the class one at a time, so
 * a large class never opens a transaction and an SMTP connection per student all at once.
 */
import type { Payload, TypedJobs } from 'payload'

import {
  sendClassAssignedEmail,
  sendClassCancelledEmail,
  sendClassRescheduledEmail,
} from '@/email/send'
import { attempt } from '@/notifications/attempt'
import { createStudentNotification } from '@/notifications/create'
import {
  createStudentClassAssignedNotificationTemplate,
  createStudentClassCancelledNotificationTemplate,
  createStudentClassRescheduledNotificationTemplate,
} from '@/notifications/templates'
import type { ClassScheduleEmailInput, ClassScheduleInfo } from '@/notifications/types'
import type { Class, Course, Enrollment, Student } from '@/payload-types'
import { relationshipId } from '@/utilities/relationshipId'

type ClassEvent = TypedJobs['tasks']['notifyClassEvent']['input']['event']

/** Who hears about their class: whoever is in it. A CANCELLED or COMPLETED enrollment is not. */
export const NOTIFIABLE_ENROLLMENT_STATUSES: readonly Enrollment['enrollmentStatus'][] = [
  'NEW',
  'CONFIRMED',
  'ATTENDED',
]

const CLASS_NOTIFICATION_EVENTS: Record<
  ClassEvent,
  {
    template: (schedule: ClassScheduleInfo) => { title: string; content: string }
    sendEmail: (payload: Payload, input: ClassScheduleEmailInput) => Promise<void>
  }
> = {
  CLASS_ASSIGNED: {
    template: createStudentClassAssignedNotificationTemplate,
    sendEmail: sendClassAssignedEmail,
  },
  CLASS_RESCHEDULED: {
    template: createStudentClassRescheduledNotificationTemplate,
    sendEmail: sendClassRescheduledEmail,
  },
  CLASS_CANCELLED: {
    template: ({ courseTitle, classCode }) =>
      createStudentClassCancelledNotificationTemplate(courseTitle, classCode),
    sendEmail: sendClassCancelledEmail,
  },
}

type ClassRecipient = {
  student: Pick<Student, 'id' | 'email' | 'fullName'>
  course: Pick<Course, 'id' | 'title'>
  classDoc: Pick<Class, 'id' | 'code' | 'startDate' | 'endDate' | 'scheduleTime' | 'location'>
}

/** Sends one student the notification and email for `event` about their class. */
export async function notifyStudentOfClass(
  payload: Payload,
  event: ClassEvent,
  { student, course, classDoc }: ClassRecipient,
): Promise<void> {
  const { template, sendEmail } = CLASS_NOTIFICATION_EVENTS[event]
  const schedule: ClassScheduleInfo = {
    courseTitle: course.title,
    classCode: classDoc.code,
    startDate: classDoc.startDate,
    endDate: classDoc.endDate,
    scheduleTime: classDoc.scheduleTime,
    location: classDoc.location,
  }

  await attempt(payload, `${event} notification failed`, () =>
    createStudentNotification(payload, {
      studentId: student.id,
      type: event,
      ...template(schedule),
      metadata: { course: course.id, class: classDoc.id },
    }),
  )
  await attempt(payload, `${event} email failed`, () =>
    sendEmail(payload, {
      to: student.email,
      studentNameOrEmail: student.fullName || student.email,
      ...schedule,
    }),
  )
}

export async function runClassNotification(
  payload: Payload,
  { classId, event }: TypedJobs['tasks']['notifyClassEvent']['input'],
): Promise<void> {
  const classDoc = await payload.findByID({
    collection: 'classes',
    id: classId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
  })
  const courseId = relationshipId(classDoc?.course)
  if (!classDoc || courseId === null) return

  const course = await payload.findByID({
    collection: 'courses',
    id: courseId,
    depth: 0,
    select: { title: true },
    disableErrors: true,
    overrideAccess: true,
  })
  if (!course) return

  const { docs: enrollments } = await payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { class: { equals: classId } },
        { enrollmentStatus: { in: [...NOTIFIABLE_ENROLLMENT_STATUSES] } },
      ],
    },
    select: { student: true },
    populate: { students: { email: true, fullName: true } },
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })

  for (const { student } of enrollments) {
    // An unpopulated relationship is a bare numeric id (INVARIANTS.md) — nobody to address.
    if (typeof student !== 'object' || student === null) continue
    await notifyStudentOfClass(payload, event, { student, course, classDoc })
  }
}
