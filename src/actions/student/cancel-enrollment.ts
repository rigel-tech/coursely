'use server'

import { cancelStudentEnrollment } from '@/services/student-enrollment'
import { getSessionStudent } from '@/lib/auth/session-student'
import {
  EnrollmentAlreadyCancelled,
  EnrollmentAlreadyStarted,
  EnrollmentHasPayment,
  EnrollmentNotCancellable,
  EnrollmentNotFound,
} from '@/lib/errors/enrollment'
import type { Student } from '@/payload-types'

export type CancelEnrollmentState =
  { status: 'success'; message: string } | { status: 'error'; message: string }

const STANDING_REFUSAL: Record<Exclude<Student['status'], 'ACTIVE'>, string> = {
  PENDING_VERIFICATION: 'Tài khoản chưa xác thực email. Vui lòng xác thực trước khi hủy đăng ký.',
  DISABLED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ trung tâm để được hỗ trợ.',
}

export async function cancelEnrollmentAction(enrollmentId: number): Promise<CancelEnrollmentState> {
  const student = await getSessionStudent()
  if (!student) {
    return {
      status: 'error',
      message: 'Không tìm thấy học sinh trong phiên. Người dùng phải đăng nhập để hủy đăng ký.',
    }
  }

  if (student.status !== 'ACTIVE') {
    return { status: 'error', message: STANDING_REFUSAL[student.status] }
  }

  try {
    await cancelStudentEnrollment(enrollmentId, student.id)
  } catch (error) {
    if (
      error instanceof EnrollmentNotFound ||
      error instanceof EnrollmentAlreadyCancelled ||
      error instanceof EnrollmentNotCancellable ||
      error instanceof EnrollmentHasPayment ||
      error instanceof EnrollmentAlreadyStarted
    ) {
      return { status: 'error', message: error.message }
    }
    throw error
  }

  return { status: 'success', message: 'Đã hủy đăng ký khóa học.' }
}
