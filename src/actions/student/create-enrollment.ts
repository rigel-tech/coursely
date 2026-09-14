'use server'

import { z } from 'zod'

import { createStudentEnrollment } from '@/services/student-enrollment'

export type CreateEnrollmentState = {
  status: 'success' | 'error'
  message: string
}

const createEnrollmentSchema = z.object({
  courseId: z.number().int().positive(),
})

/** Creates an enrollment for the signed-in student and selected course. */
export async function createEnrollmentAction(courseId: number): Promise<CreateEnrollmentState> {
  const parsed = createEnrollmentSchema.safeParse({ courseId })
  if (!parsed.success) {
    return { status: 'error', message: 'Khóa học không hợp lệ.' }
  }

  await createStudentEnrollment(parsed.data.courseId)
  return { status: 'success', message: 'Đăng ký khóa học thành công.' }
}
