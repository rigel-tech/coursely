import type { Payload } from 'payload'
import { sendClassAssignedEmail } from '@/email/send'
import { createStudentNotification } from '@/notifications/create'
import { createStudentClassAssignedNotificationTemplate } from '@/notifications/templates'
import type { Class, Course, Student } from '@/payload-types'
import { toClassScheduleInfo } from './types'

export interface NotifyClassAssignedInput {
  payload: Payload
  student: Pick<Student, 'id' | 'email'> & { fullName?: string | null }
  course: Pick<Course, 'id' | 'title'>
  classDoc: Pick<Class, 'id' | 'code' | 'startDate' | 'endDate' | 'scheduleTime' | 'location'>
}

export function notifyClassAssigned({
  payload,
  student,
  course,
  classDoc,
}: NotifyClassAssignedInput): void {
  const scheduleInfo = toClassScheduleInfo(course, classDoc)
  const { title, content } = createStudentClassAssignedNotificationTemplate(scheduleInfo)

  void createStudentNotification(payload, {
    studentId: student.id,
    type: 'CLASS_ASSIGNED',
    title,
    content,
    metadata: { course: course.id, class: classDoc.id },
  }).catch((err) => payload.logger.error({ err }, 'CLASS_ASSIGNED notification failed'))

  void sendClassAssignedEmail(payload, {
    to: student.email,
    studentNameOrEmail: student.fullName || student.email,
    ...scheduleInfo,
  }).catch((err) => payload.logger.error({ err }, 'CLASS_ASSIGNED email failed'))
}
