'use server'

import configPromise from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import { getSessionStudent } from '@/lib/auth/session-student'
import { sendEnrollmentConfirmationEmail } from '@/email/send'
import type { Enrollment } from '@/payload-types'

/** Creates a self-registration for the currently authenticated student. */
export async function createStudentEnrollment(courseId: number): Promise<Enrollment> {
  const student = await getSessionStudent()
  if (!student || student.status !== 'ACTIVE') {
    throw new Error('Vui lòng đăng nhập để đăng ký khóa học.')
  }

  const payload = await getPayload({ config: configPromise })
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }

  let enrollment: Enrollment
  let courseTitle: string

  try {
    const course = await payload.findByID({
      collection: 'courses',
      id: courseId,
      depth: 0,
      draft: false,
      overrideAccess: true,
      req,
    })

    courseTitle = course.title

    enrollment = await payload.create({
      collection: 'enrollments',
      data: {
        student: student.id,
        course: courseId,
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
        student: student.id,
        type: 'ENROLLMENT_CREATED',
        title: 'Đăng ký khóa học thành công',
        content: `Bạn đã đăng ký khóa học "${course.title}" thành công. Đơn đăng ký đang chờ trung tâm xác nhận.`,
        metadata: { course: courseId },
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

  // Tác vụ gửi email nằm ngoài transaction (chạy sau khi commit thành công)
  void sendEnrollmentConfirmationEmail(payload, student.email, courseTitle).catch((error) =>
    payload.logger.error({ error }, 'ENROLLMENT_CONFIRMATION email failed'),
  )

  return enrollment
}
