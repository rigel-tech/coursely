import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'
import {
  CourseNotFound,
  EnrollmentAlreadyCancelled,
  EnrollmentAlreadyExists,
  EnrollmentAlreadyStarted,
  EnrollmentHasPayment,
  EnrollmentNotCancellable,
  EnrollmentNotFound,
  RegistrationClosed,
  RegistrationNotOpen,
} from '@/lib/errors/enrollment'
import { notifyEnrollment } from '@/notifications/enrollment'
import type { Course, Enrollment, Student } from '@/payload-types'

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

async function checkExistingEnrollment(
  payload: Payload,
  { studentId, courseId }: { studentId: number; courseId: number },
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

async function createEnrollment(
  payload: Payload,
  { studentId, course }: { studentId: number; course: Course },
): Promise<number> {
  await checkExistingEnrollment(payload, { studentId, courseId: course.id })

  const enrollment = await payload.create({
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
  })

  return enrollment.id
}

/**
 * The pure eligibility rule for student self-cancellation (specs/012): `NEW`/`CONFIRMED`,
 * fully unpaid, and — if assigned to a class — that class has not started yet. Shared by
 * `cancelStudentEnrollment` (which enforces it) and `getActiveEnrollmentStatus` (which only
 * uses it to decide whether to show a cancel control) so the rule is never duplicated.
 */
type CancellableEnrollment = {
  enrollmentStatus: Enrollment['enrollmentStatus']
  paymentStatus: Enrollment['paymentStatus']
  class?: Enrollment['class']
}

export function isEnrollmentCancellable(
  enrollment: CancellableEnrollment,
  now: Date = new Date(),
): boolean {
  if (enrollment.enrollmentStatus !== 'NEW' && enrollment.enrollmentStatus !== 'CONFIRMED') {
    return false
  }
  if (enrollment.paymentStatus !== 'UNPAID') {
    return false
  }

  const assignedClass = enrollment.class
  const startDate =
    assignedClass && typeof assignedClass === 'object' ? assignedClass.startDate : undefined

  if (startDate && new Date(startDate) <= now) {
    return false
  }

  return true
}

/**
 * The student's current active (non-CANCELLED) enrollment for a course, or `undefined` if
 * none — used by the course detail page to choose between the registration form and a
 * status badge, and whether to offer a cancel control. Same `where` shape as
 * `checkExistingEnrollment`, so a CANCELLED enrollment never blocks the form from showing
 * again (FR-008). `depth: 1` so `canCancel` can inspect an assigned class's `startDate`.
 */
type ActiveEnrollmentStatus = {
  id: number
  enrollmentStatus: Enrollment['enrollmentStatus']
  canCancel: boolean
}

export async function getActiveEnrollmentStatus(
  payload: Payload,
  studentId: number,
  courseId: number,
): Promise<ActiveEnrollmentStatus | undefined> {
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
    depth: 1,
    overrideAccess: true,
  })

  const enrollment = result.docs[0]
  if (!enrollment) return undefined

  return {
    id: enrollment.id,
    enrollmentStatus: enrollment.enrollmentStatus,
    canCancel: isEnrollmentCancellable(enrollment),
  }
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
 * itself, to avoid doing that work twice on every registration. Resolves the new
 * enrollment's id so the caller can offer an immediate cancel control without a reload.
 */
export async function createStudentEnrollment({
  courseId,
  student,
}: {
  courseId: number
  student: Pick<Student, 'id' | 'email'>
}): Promise<number> {
  const payload = await getPayload({ config: configPromise })
  const course = await validateCourseForEnrollment(payload, courseId)

  const enrollmentId = await createEnrollment(payload, { studentId: student.id, course })

  notifyEnrollment({ payload, event: 'ENROLLMENT_CREATED', student, course })

  return enrollmentId
}

/**
 * Cancels `enrollmentId` on behalf of `studentId` — re-validates ownership and every
 * eligibility rule server-side (never trusts a client-shown `canCancel`), then writes
 * `enrollmentStatus: 'CANCELLED'` and `cancelledAt`. `depth: 1` so the assigned class's
 * `startDate` and the student/course needed for the confirmation notification are already
 * on hand, no second round trip. A non-owner and a non-existent id throw the identical
 * `EnrollmentNotFound` — never confirms another student's enrollment exists.
 */
export async function cancelStudentEnrollment(
  enrollmentId: number,
  studentId: number,
): Promise<void> {
  const payload = await getPayload({ config: configPromise })

  const enrollment = await payload
    .findByID({
      collection: 'enrollments',
      id: enrollmentId,
      depth: 1,
      overrideAccess: true,
    })
    .catch(() => null)

  const ownerId =
    enrollment && typeof enrollment.student === 'object'
      ? enrollment.student.id
      : enrollment?.student

  if (!enrollment || ownerId !== studentId) {
    throw new EnrollmentNotFound()
  }

  if (enrollment.enrollmentStatus === 'CANCELLED') {
    throw new EnrollmentAlreadyCancelled()
  }
  if (enrollment.enrollmentStatus === 'ATTENDED' || enrollment.enrollmentStatus === 'COMPLETED') {
    throw new EnrollmentNotCancellable()
  }
  if (enrollment.paymentStatus !== 'UNPAID') {
    throw new EnrollmentHasPayment()
  }

  const assignedClass = enrollment.class
  if (
    assignedClass &&
    typeof assignedClass === 'object' &&
    assignedClass.startDate &&
    new Date(assignedClass.startDate) <= new Date()
  ) {
    throw new EnrollmentAlreadyStarted()
  }

  await payload.update({
    collection: 'enrollments',
    id: enrollmentId,
    data: { enrollmentStatus: 'CANCELLED', cancelledAt: new Date().toISOString() },
    overrideAccess: true,
  })

  if (typeof enrollment.student === 'object' && typeof enrollment.course === 'object') {
    notifyEnrollment({
      payload,
      event: 'ENROLLMENT_CANCELLED',
      student: enrollment.student,
      course: enrollment.course,
    })
  }
}

export async function getStudentEnrollments(payload: Payload, studentId: number) {
  const result = await payload.find({
    collection: 'enrollments',
    where: {
      student: { equals: studentId },
    },
    sort: '-createdAt',
    depth: 1,
    limit: 100,
    overrideAccess: true,
  })
  return result.docs
}
