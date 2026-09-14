'use server'

import { createStudentEnrollment, findCourseSlug } from '@/services/student-enrollment'
import { getSessionStudent } from '@/lib/auth/session-student'
import { EnrollmentAlreadyExists } from '@/lib/errors/enrollment'
import type { Student } from '@/payload-types'
import { z } from 'zod'

/**
 * What `<CourseRegistrationForm>` acts on. `redirectTo` is set only when signing in is
 * what would help; every other refusal is a `message` the student reads where they stand.
 */
export type CreateEnrollmentState = {
  status: 'success' | 'error'
  message: string
  redirectTo?: string
}

const createEnrollmentSchema = z.object({
  courseId: z.number().int().positive(),
})

// Copy for every standing that cannot enrol. Typed as `Student['status']` minus `ACTIVE`
// so adding a status to the collection stops compiling here until someone writes its
// message — otherwise a new status silently inherits whatever branch it happens to fall
// into, and the account is refused with another standing's reason.
const STANDING_REFUSAL: Record<Exclude<Student['status'], 'ACTIVE'>, string> = {
  PENDING_VERIFICATION:
    'Tài khoản chưa xác thực email. Vui lòng xác thực trước khi đăng ký khóa học.',
  DISABLED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ trung tâm để được hỗ trợ.',
}

/**
 * Creates an enrollment for the signed-in student and selected course.
 *
 * The sign-in check lives here rather than in the button that opens the form: a screen
 * deciding in advance whether to offer registration is a guess the server has to re-check
 * anyway, and the guess is what a caller skipping the UI walks straight past.
 *
 * Order matters. A malformed course id is rejected before any lookup; being signed out
 * outranks anything about the course itself, so a visitor is never told a deadline passed
 * on a course they have not proven they may see.
 */
export async function createEnrollmentAction(courseId: number): Promise<CreateEnrollmentState> {
  const parsed = createEnrollmentSchema.safeParse({ courseId })
  if (!parsed.success) {
    return { status: 'error', message: 'Khóa học không hợp lệ.' }
  }

  const student = await getSessionStudent()
  if (!student) return signInFirst(parsed.data.courseId)

  // Default-deny: anything that is not ACTIVE is refused, and told why. Sending these
  // accounts to sign-in would loop — signing in again changes no account's standing.
  if (student.status !== 'ACTIVE') {
    return { status: 'error', message: STANDING_REFUSAL[student.status] }
  }

  try {
    await createStudentEnrollment(parsed.data.courseId)
  } catch (error) {
    // The one refusal with copy of its own so far (specs/008-enrollment-duplicate-guard).
    // Anything else is rethrown — an error nobody wrote a message for is a bug, not a
    // "please try again" to hide it behind (mirrors loginAction's instanceof chain).
    if (error instanceof EnrollmentAlreadyExists) {
      return { status: 'error', message: error.message }
    }
    throw error
  }

  return { status: 'success', message: 'Đăng ký khóa học thành công.' }
}

// The return path is built from the course id, never taken from the caller — a
// caller-supplied destination is the open redirect this avoids. `/khoa-hoc/<slug>` is the
// course page's public URL; the `/courses/<slug>` folder path reaches the same page but is
// not a URL to hand anyone.
async function signInFirst(courseId: number): Promise<CreateEnrollmentState> {
  const slug = await findCourseSlug(courseId)
  const callbackUrl = slug ? `/khoa-hoc/${slug}` : '/khoa-hoc'

  return {
    status: 'error',
    message: 'Vui lòng đăng nhập để đăng ký khóa học.',
    redirectTo: `/dang-nhap?callbackUrl=${encodeURIComponent(callbackUrl)}`,
  }
}
