import type { Payload } from 'payload'
import { sendClassCancelledEmail, sendClassRescheduledEmail } from '@/email/send'
import { createStudentNotification } from '@/notifications/create'
import {
  createStudentClassCancelledNotificationTemplate,
  createStudentClassRescheduledNotificationTemplate,
} from '@/notifications/templates'
import type { Class, Course, Student } from '@/payload-types'
import { toClassScheduleInfo } from './types'

export interface NotifyClassChangeInput {
  payload: Payload
  classDoc: Class
  course: Course
  isCancelled: boolean
}

export async function notifyClassScheduleOrStatusChange({
  payload,
  classDoc,
  course,
  isCancelled,
}: NotifyClassChangeInput): Promise<void> {
  const { docs: enrollments } = await payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { class: { equals: classDoc.id } },
        { enrollmentStatus: { in: ['CONFIRMED', 'ATTENDED'] } },
      ],
    },
    select: { student: true },
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })

  if (enrollments.length === 0) return

  const scheduleInfo = toClassScheduleInfo(course, classDoc)
  const type = isCancelled ? 'CLASS_CANCELLED' : 'CLASS_RESCHEDULED'
  const template = isCancelled
    ? createStudentClassCancelledNotificationTemplate(course.title, classDoc.code)
    : createStudentClassRescheduledNotificationTemplate(scheduleInfo)

  const sendEmail = isCancelled
    ? (to: string, studentNameOrEmail: string) =>
        sendClassCancelledEmail(payload, {
          to,
          studentNameOrEmail,
          courseTitle: course.title,
          classCode: classDoc.code,
        })
    : (to: string, studentNameOrEmail: string) =>
        sendClassRescheduledEmail(payload, {
          to,
          studentNameOrEmail,
          ...scheduleInfo,
        })

  for (const enrollment of enrollments) {
    const student = enrollment.student as Student | null
    if (!student?.email) continue

    const studentNameOrEmail = student.fullName || student.email

    void createStudentNotification(payload, {
      studentId: student.id,
      type,
      title: template.title,
      content: template.content,
      metadata: { course: course.id, class: classDoc.id },
    }).catch((err) => payload.logger.error({ err }, `${type} notification failed`))

    void sendEmail(student.email, studentNameOrEmail).catch((err) =>
      payload.logger.error({ err }, `${type} email failed`),
    )
  }
}
