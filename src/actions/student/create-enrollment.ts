'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { createStudentEnrollment, findCourseSlug } from '@/services/student-enrollment'
import { getSessionStudent } from '@/lib/auth/session-student'
import {
  CourseNotFound,
  EnrollmentAlreadyExists,
  RegistrationClosed,
  RegistrationNotOpen,
} from '@/lib/errors/enrollment'
import type { CreateEnrollmentState } from '@/lib/constants/create-enrollment-state'
import {
  createEnrollmentSchema,
  type CreateEnrollmentInput,
} from '@/lib/validation/create-enrollment-schema'
import type { Student } from '@/payload-types'

export type { CreateEnrollmentInput, CreateEnrollmentState }

const STANDING_REFUSAL: Record<Exclude<Student['status'], 'ACTIVE'>, string> = {
  PENDING_VERIFICATION:
    'Tài khoản chưa xác thực email. Vui lòng xác thực trước khi đăng ký khóa học.',
  DISABLED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ trung tâm để được hỗ trợ.',
}

export async function createEnrollmentAction(
  input: CreateEnrollmentInput,
): Promise<CreateEnrollmentState> {
  // A malformed course id is rejected before any lookup — it needs no session to know it's
  // wrong. fullName/phone are validated only once a session is confirmed, below: a
  // signed-out visitor's blank profile fields must still reach the sign-in redirect
  // instead of this schema's "required" errors.
  const courseId = createEnrollmentSchema.shape.courseId.safeParse(input.courseId)
  if (!courseId.success) {
    const message = courseId.error.issues.map((issue) => issue.message).join(' ')
    return { status: 'error', message }
  }

  const student = await getSessionStudent()
  if (!student) return requireLogin(courseId.data)

  const parsed = createEnrollmentSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(' ')
    return { status: 'error', message }
  }

  if (student.status !== 'ACTIVE') {
    return { status: 'error', message: STANDING_REFUSAL[student.status] }
  }

  if (parsed.data.fullName !== student.fullName || parsed.data.phone !== student.phone) {
    const payload = await getPayload({ config: configPromise })
    await payload.update({
      collection: 'students',
      id: student.id,
      data: { fullName: parsed.data.fullName, phone: parsed.data.phone },
      overrideAccess: true,
    })
  }

  try {
    await createStudentEnrollment({ courseId: parsed.data.courseId, student })
  } catch (error) {
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

async function requireLogin(courseId: number): Promise<CreateEnrollmentState> {
  const slug = await findCourseSlug(courseId)
  const callbackUrl = slug ? `/khoa-hoc/${slug}` : '/khoa-hoc'

  return {
    status: 'error',
    message: 'Vui lòng đăng nhập để đăng ký khóa học.',
    redirectTo: `/dang-nhap?callbackUrl=${encodeURIComponent(callbackUrl)}`,
  }
}
