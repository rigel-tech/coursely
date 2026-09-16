import { z } from 'zod'
import { VIETNAM_PHONE_REGEX } from './profile-schema'

/**
 * The Server Action's parameters are data sent by the client, not a value this module
 * constructed — `fullName`/`phone` are optional (a signed-out visitor's form has no
 * profile to send, and must still reach the sign-in redirect rather than a "profile
 * incomplete" refusal, specs/007-student-enrollment research.md Decision 5), but
 * `courseId` still needs its own runtime check the same way: nothing stops a caller from
 * sending a `courseId` that is not a number at all.
 */
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
