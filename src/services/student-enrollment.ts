'use server'

import configPromise from '@payload-config'
import { getPayload, Payload, ValidationError, type PayloadRequest } from 'payload'
import { sendEnrollmentConfirmationEmail } from '@/email/send'
import { EnrollmentAlreadyExists } from '@/lib/errors/enrollment'
import { createNotification } from '@/notifications/create'
import { enrollmentCreatedNotification } from '@/notifications/templates/enrollment-created'
import { Course, Student } from '@/payload-types'

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

/**
 * Fast, specific path for the ordinary (non-racing) case — FR-002/FR-008. This check is
 * not itself the guard: two of these can both pass before either write lands, which is
 * exactly why the partial unique index in `payload.config.ts`'s `afterSchemaInit` exists
 * as the actual backstop (caught below, in `processEnrollmentTransaction`). CANCELLED is
 * excluded here to match that index's `WHERE` clause — a cancelled enrollment must not
 * block re-registration.
 */
async function checkExistingEnrollment(
  payload: Payload,
  studentId: number,
  courseId: number,
): Promise<void> {
  const existing = await payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { student: { equals: studentId } },
        { course: { equals: courseId } },
        { enrollmentStatus: { not_equals: 'CANCELLED' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    throw new EnrollmentAlreadyExists()
  }
}

async function processEnrollmentTransaction(
  payload: Payload,
  studentId: number,
  course: Course,
): Promise<void> {
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }

  try {
    await checkExistingEnrollment(payload, studentId, course.id)

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
    } catch (error) {
      if (error instanceof ValidationError) throw new EnrollmentAlreadyExists()
      throw error
    }

    const { title, content } = enrollmentCreatedNotification(course.title)
    await createNotification(
      payload,
      {
        studentId,
        type: 'ENROLLMENT_CREATED',
        title,
        content,
        metadata: { course: course.id },
      },
      req,
    )

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

/**
 * Creates the enrollment for `student`, already resolved and confirmed `ACTIVE` by the
 * caller (`createEnrollmentAction`) — this does not re-fetch or re-check the session
 * itself, to avoid doing that work twice on every registration.
 */
export async function createStudentEnrollment(courseId: number, student: Student): Promise<void> {
  const payload = await getPayload({ config: configPromise })
  const course = await validateCourseForEnrollment(payload, courseId)

  await processEnrollmentTransaction(payload, student.id, course)

  void sendEnrollmentConfirmationEmail(payload, student.email, course.title).catch((error) =>
    payload.logger.error({ error }, 'ENROLLMENT_CONFIRMATION email failed'),
  )
}
