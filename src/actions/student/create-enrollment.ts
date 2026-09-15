'use server'

import { createStudentEnrollment, findCourseSlug } from '@/services/student-enrollment'
import { StudentProfileWrite, updateStudentProfile } from '@/services/student-profile'
import { getSessionStudent } from '@/lib/auth/session-student'
import {
  CourseNotFound,
  EnrollmentAlreadyExists,
  RegistrationClosed,
  RegistrationNotOpen,
} from '@/lib/errors/enrollment'
import { enrollmentProfileSchema } from '@/lib/validation/enrollment-profile-schema'
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

/**
 * `fullName`/`phone` are optional here — a signed-out visitor's form has no profile to
 * send, and must still reach the sign-in redirect rather than a "profile incomplete"
 * refusal (specs/007-student-enrollment, research.md Decision 5). They
 * become required only once a signed-in, `ACTIVE` student is confirmed, via
 * `enrollmentProfileSchema`.
 */
export type CreateEnrollmentInput = {
  courseId: number
  fullName?: string
  phone?: string
}

const createEnrollmentSchema = z.object({
  courseId: z.number().int().positive(),
})

const PROFILE_INCOMPLETE_MESSAGE =
  'Vui lòng bổ sung đầy đủ họ và tên, số điện thoại trước khi đăng ký khóa học.'

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
export async function createEnrollmentAction(
  input: CreateEnrollmentInput,
): Promise<CreateEnrollmentState> {
  const parsed = createEnrollmentSchema.safeParse({ courseId: input.courseId })
  if (!parsed.success) {
    return { status: 'error', message: 'Khóa học không hợp lệ.' }
  }

  const student = await getSessionStudent()
  if (!student) return requireLogin(parsed.data.courseId)

  // Default-deny: anything that is not ACTIVE is refused, and told why. Sending these
  // accounts to sign-in would loop — signing in again changes no account's standing.
  if (student.status !== 'ACTIVE') {
    return { status: 'error', message: STANDING_REFUSAL[student.status] }
  }

  // Checked only once a signed-in, ACTIVE student is confirmed — never ahead of the two
  // checks above, or a signed-out visitor's empty fields would be misread as an
  // incomplete profile instead of sending them to sign in (research.md Decision 1).
  const profile = enrollmentProfileSchema.safeParse({
    fullName: input.fullName,
    phone: input.phone,
  })

  if (!profile.success) {
    return { status: 'error', message: PROFILE_INCOMPLETE_MESSAGE }
  }

  const profileChanged =
    profile.data.fullName !== student.fullName || profile.data.phone !== student.phone

  try {
    // Saved before attempting the enrollment, and not part of its transaction, so a
    // correction survives a refusal for an unrelated reason below (FR-005). Skipped when
    // nothing changed, so reviewing an already-complete profile costs no write.
    if (profileChanged) {
      const studentProfile: StudentProfileWrite = {
        studentId: student.id,
        fullName: profile.data.fullName,
        phone: profile.data.phone,
      }
      await updateStudentProfile(studentProfile)
    }
    await createStudentEnrollment({ courseId: parsed.data.courseId, student })
  } catch (error) {
    // Every refusal this flow distinguishes (specs/007-student-enrollment, Stories 3–4).
    // Anything else is rethrown — an error nobody wrote a message for is a bug, not a
    // "please try again" to hide it behind (mirrors loginAction's instanceof chain).
    if (
      error instanceof EnrollmentAlreadyExists ||
      error instanceof CourseNotFound ||
      error instanceof RegistrationNotOpen ||
      error instanceof RegistrationClosed
    ) {
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
async function requireLogin(courseId: number): Promise<CreateEnrollmentState> {
  const slug = await findCourseSlug(courseId)
  const callbackUrl = slug ? `/khoa-hoc/${slug}` : '/khoa-hoc'

  return {
    status: 'error',
    message: 'Vui lòng đăng nhập để đăng ký khóa học.',
    redirectTo: `/dang-nhap?callbackUrl=${encodeURIComponent(callbackUrl)}`,
  }
}
