import { z } from 'zod'
import { VIETNAM_PHONE_REGEX } from './profile-schema'

const PHONE_INVALID_MESSAGE = 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)'

export const createEnrollmentSchema = z.object({
  courseId: z
    .number({ error: 'Khóa học không hợp lệ.' })
    .int('Khóa học không hợp lệ.')
    .positive('Khóa học không hợp lệ.'),
  fullName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập họ và tên.')
    .max(255, 'Họ và tên không được vượt quá 255 ký tự'),
  phone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại.')
    .refine((val) => VIETNAM_PHONE_REGEX.test(val), { message: PHONE_INVALID_MESSAGE }),
})

/**
 * What the Server Action actually accepts — looser than `createEnrollmentSchema`'s own
 * parsed shape, because a signed-out visitor's request has no profile to send yet and must
 * still reach the sign-in redirect rather than fail here on a missing `fullName`/`phone`.
 */
export type CreateEnrollmentInput = { courseId: number; fullName: string; phone: string }
