'use server'

import configPromise from '@payload-config'
import { getPayload, Payload, type PayloadRequest } from 'payload'
import { getSessionStudent } from '@/lib/auth/session-student'
import { sendEnrollmentConfirmationEmail } from '@/email/send'
import { Course } from '@/payload-types'

async function validateCourseForEnrollment(payload: Payload, courseId: number): Promise<Course> {
  const course: Course | null = await payload.findByID({
    collection: 'courses',
    id: courseId,
    depth: 0,
    draft: false,
    overrideAccess: true,
  })

  if (!course) {
    throw new Error('Khóa học không tồn tại.')
  }

  const now = new Date()

  if (course.registrationStartAt && new Date(course.registrationStartAt) > now) {
    throw new Error('Khóa học chưa đến thời gian mở đăng ký.')
  }

  if (course.registrationEndAt && new Date(course.registrationEndAt) < now) {
    throw new Error('Thời hạn đăng ký khóa học này đã kết thúc.')
  }

  return course
}

async function processEnrollmentTransaction(
  payload: Payload,
  studentId: number,
  course: Course,
): Promise<void> {
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }

  try {
    await payload.create({
      collection: 'enrollments',
      data: {
        student: studentId,
        course: course.id,
        registrationSource: 'SELF_REGISTRATION',
        enrollmentStatus: 'NEW',
        paymentStatus: 'UNPAID',
        registeredAt: new Date().toISOString(),
      },
      draft: false,
      overrideAccess: true,
      req,
    })

    await payload.create({
      collection: 'notifications',
      data: {
        student: studentId,
        type: 'ENROLLMENT_CREATED',
        title: 'Đăng ký khóa học thành công',
        content: `Bạn đã đăng ký khóa học "${course.title}" thành công. Đơn đăng ký đang chờ trung tâm xác nhận.`,
        metadata: { course: course.id },
        isRead: false,
      },
      draft: false,
      overrideAccess: true,
      req,
    })

    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}

/** The course's public slug, or `null` when no course carries that id. */
export async function findCourseSlug(courseId: number): Promise<string | null> {
  const payload = await getPayload({ config: configPromise })

  const course = await payload.findByID({
    collection: 'courses',
    id: courseId,
    depth: 0,
    disableErrors: true,
    draft: false,
    overrideAccess: true,
  })

  return course?.slug ?? null
}

export async function createStudentEnrollment(courseId: number): Promise<void> {
  const student = await getSessionStudent()
  if (!student || student.status !== 'ACTIVE') {
    throw new Error('Vui lòng đăng nhập để đăng ký khóa học.')
  }

  const payload = await getPayload({ config: configPromise })
  const course = await validateCourseForEnrollment(payload, courseId)

  await processEnrollmentTransaction(payload, student.id, course)

  void sendEnrollmentConfirmationEmail(payload, student.email, course.title).catch((error) =>
    payload.logger.error({ error }, 'ENROLLMENT_CONFIRMATION email failed'),
  )
}
