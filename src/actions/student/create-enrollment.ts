'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { createStudentEnrollment } from '@/services/student-enrollment'
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
  const parsed = createEnrollmentSchema.safeParse(input)
  if (!parsed.success) {
    const error = parsed.error.issues.map((issue) => issue.message).join(' ')
    return { status: 'error', message: error }
  }

  const { courseId, fullName, phone } = parsed.data
  const student = await getSessionStudent()
  if (!student) {
    return {
      status: 'error',
      message: 'Không tìm thấy học sinh trong phiên. Người dùng phải đăng nhập để đăng ký.',
    }
  }

  if (student.status !== 'ACTIVE') {
    return { status: 'error', message: STANDING_REFUSAL[student.status] }
  }

  if (fullName !== student.fullName || phone !== student.phone) {
    const payload = await getPayload({ config: configPromise })
    await payload.update({
      collection: 'students',
      id: student.id,
      data: { fullName, phone },
      overrideAccess: true,
    })
  }

  let enrollmentId: number
  try {
    enrollmentId = await createStudentEnrollment({ courseId, student })
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

  return { status: 'success', message: 'Đăng ký khóa học thành công.', enrollmentId }
}
