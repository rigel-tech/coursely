import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { sendEnrollmentConfirmationEmail } from '@/email/send'
import {
  CourseNotFound,
  EnrollmentAlreadyExists,
  RegistrationClosed,
  RegistrationNotOpen,
} from '@/lib/errors/enrollment'
import { createStudentNotification } from '@/notifications/create'
import { createStudentEnrolledNotificationTemplate } from '@/notifications/templates/enrollment-created'
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
): Promise<void> {
  await checkExistingEnrollment(payload, { studentId, courseId: course.id })

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
  })
}

function notifyEnrollmentCreated(
  payload: Payload,
  { studentId, studentEmail, course }: { studentId: number; studentEmail: string; course: Course },
): void {
  const { title, content } = createStudentEnrolledNotificationTemplate(course.title)
  void createStudentNotification(payload, {
    studentId,
    type: 'ENROLLMENT_CREATED',
    title,
    content,
    metadata: { course: course.id },
  }).catch((err) => payload.logger.error({ err }, 'ENROLLMENT_CREATED notification failed'))

  void sendEnrollmentConfirmationEmail(payload, {
    to: studentEmail,
    courseTitle: course.title,
  }).catch((err) => payload.logger.error({ err }, 'ENROLLMENT_CONFIRMATION email failed'))
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
  student: Pick<Student, 'id' | 'email'>
}): Promise<void> {
  const payload = await getPayload({ config: configPromise })
  const course = await validateCourseForEnrollment(payload, courseId)

  await createEnrollment(payload, { studentId: student.id, course })

  notifyEnrollmentCreated(payload, { studentId: student.id, studentEmail: student.email, course })
}

export interface AssignedClassSummary {
  code: string
  startDate: string
  endDate?: string | null
  scheduleTime?: string | null
  location?: string | null
}

export interface StudentEnrollmentItem {
  id: number
  course: {
    id: number
    title: string
    slug: string
    duration?: string | null
  }
  class?: AssignedClassSummary | null
  enrollmentStatus: Enrollment['enrollmentStatus']
  paymentStatus: Enrollment['paymentStatus']
  registeredAt?: string | null
  createdAt: string
}

/**
 * Lấy danh sách đơn đăng ký của học viên đã được làm sạch để an toàn khi serialize về phía client.
 * Yêu cầu `depth: 1` để populate `course` và `class`.
 * Chỉ chọn lọc 5 trường công khai của lớp học (`code`, `startDate`, `endDate`, `scheduleTime`, `location`),
 * đồng thời lọc bỏ các lớp DRAFT/CANCELLED nhằm bảo mật thông tin nội bộ của `Classes`.
 * Xem INVARIANTS.md ("ProfileForm and getStudentEnrollments depend on depth: 1").
 */
export async function getStudentEnrollments(
  payload: Payload,
  studentId: number,
): Promise<StudentEnrollmentItem[]> {
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
    .map((doc): StudentEnrollmentItem | null => {
      const course = typeof doc.course === 'object' && doc.course !== null ? doc.course : null
      if (!course) return null

      const assignedClass: AssignedClassSummary | null =
        typeof doc.class === 'object' &&
        doc.class !== null &&
        doc.class.status !== 'DRAFT' &&
        doc.class.status !== 'CANCELLED'
          ? {
              code: doc.class.code,
              startDate: doc.class.startDate,
              endDate: doc.class.endDate,
              scheduleTime: doc.class.scheduleTime,
              location: doc.class.location,
            }
          : null

      return {
        id: doc.id,
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          duration: course.duration,
        },
        class: assignedClass,
        enrollmentStatus: doc.enrollmentStatus,
        paymentStatus: doc.paymentStatus,
        registeredAt: doc.registeredAt,
        createdAt: doc.createdAt,
      }
    })
    .filter((item): item is StudentEnrollmentItem => item !== null)
}
