/**
 * The strict reading `/dang-ky` needs — full name and phone are required here, unlike
 * `/tai-khoan`'s `profileSchema`. Kept as its own schema, not derived from it, since the
 * two screens' rules diverge on more than just "required": this one also trims.
 */
import { z } from 'zod'

import { VIETNAM_PHONE_REGEX } from './profile-schema'

const PHONE_INVALID_MESSAGE = 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)'

export const enrollmentProfileSchema = z.object({
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
export type EnrollmentProfileValues = z.infer<typeof enrollmentProfileSchema>
