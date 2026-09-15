import configPromise from '@payload-config'
import { getPayload, Payload, ValidationError, type PayloadRequest } from 'payload'
import { sendEnrollmentConfirmationEmail } from '@/email/send'
import {
  CourseNotFound,
  EnrollmentAlreadyExists,
  RegistrationClosed,
  RegistrationNotOpen,
} from '@/lib/errors/enrollment'
import { createNotification } from '@/notifications/create'
import { enrollmentCreatedNotification } from '@/notifications/templates/enrollment-created'
import { Course, Enrollment, Student } from '@/payload-types'

/**
 * A plain `id` lookup (`findByID`) does not filter by publish status — a course that has
 * never been published still resolves. Filtering `_status` explicitly is what actually
 * keeps a draft-only course out of this flow, matching `queryCourseBySlug` in the course
 * detail page.
 */
async function findPublishedCourse(payload: Payload, courseId: number): Promise<Course | null> {
  const result = await payload.find({
    collection: 'courses',
    where: {
      id: { equals: courseId },
      _status: { equals: 'published' },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return result.docs[0] ?? null
}

async function validateCourseForEnrollment(payload: Payload, courseId: number): Promise<Course> {
  const course = await findPublishedCourse(payload, courseId)

  if (!course) {
    throw new CourseNotFound()
  }

  const now = new Date()

  if (course.registrationStartAt && new Date(course.registrationStartAt) > now) {
    throw new RegistrationNotOpen()
  }

  if (course.registrationEndAt && new Date(course.registrationEndAt) < now) {
    throw new RegistrationClosed()
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
  {
    studentId,
    courseId,
    req,
  }: { studentId: number; courseId: number; req: Partial<PayloadRequest> },
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
    req,
  })

  if (existing.docs.length > 0) {
    throw new EnrollmentAlreadyExists()
  }
}

async function processEnrollmentTransaction(
  payload: Payload,
  { studentId, course }: { studentId: number; course: Course },
): Promise<void> {
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }

  try {
    // Same transaction as everything below — the pre-check's own read is not the race
    // guard (the partial unique index is), but running it outside the transaction that
    // is about to write serves no purpose either.
    await checkExistingEnrollment(payload, { studentId, courseId: course.id, req })

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
    await createNotification(payload, {
      studentId,
      type: 'ENROLLMENT_CREATED',
      title,
      content,
      metadata: { course: course.id },
      req,
    })

    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}

/**
 * The student's current active (non-CANCELLED) enrollment status for a course, or
 * `undefined` if none — used by the course detail page to choose between the
 * registration form and a status badge. Same `where` shape as `checkExistingEnrollment`,
 * so a CANCELLED enrollment never blocks the form from showing again (FR-008).
 */
export async function getActiveEnrollmentStatus(
  payload: Payload,
  { studentId, courseId }: { studentId: number; courseId: number },
): Promise<Enrollment['enrollmentStatus'] | undefined> {
  const result = await payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { student: { equals: studentId } },
        { course: { equals: courseId } },
        { enrollmentStatus: { not_equals: 'CANCELLED' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return result.docs[0]?.enrollmentStatus
}

/** The course's public slug, or `null` when no course carries that id — never a draft's. */
export async function findCourseSlug(courseId: number): Promise<string | null> {
  const payload = await getPayload({ config: configPromise })
  const course = await findPublishedCourse(payload, courseId)

  return course?.slug ?? null
}

/**
 * Creates the enrollment for `student`, already resolved and confirmed `ACTIVE` by the
 * caller (`createEnrollmentAction`) — this does not re-fetch or re-check the session
 * itself, to avoid doing that work twice on every registration.
 */
export async function createStudentEnrollment({
  courseId,
  student,
}: {
  courseId: number
  student: Student
}): Promise<void> {
  const payload = await getPayload({ config: configPromise })
  const course = await validateCourseForEnrollment(payload, courseId)

  await processEnrollmentTransaction(payload, { studentId: student.id, course })

  void sendEnrollmentConfirmationEmail(payload, {
    to: student.email,
    courseTitle: course.title,
  }).catch((err) => payload.logger.error({ err }, 'ENROLLMENT_CONFIRMATION email failed'))
}
