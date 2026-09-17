/**
 * Zod schema for a student's own profile fields (full name, phone), used by `/tai-khoan`'s
 * `<ProfileForm>` — blank allowed, untrimmed. `create-enrollment-schema.ts` has its own,
 * stricter, required version for the registration screen; it is not derived from this one.
 */
import { z } from 'zod'

export const VIETNAM_PHONE_REGEX = /^(?:(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9]))\d{7}$/

const PHONE_INVALID_MESSAGE = 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)'

export const profileSchema = z.object({
  fullName: z.string().max(255, 'Họ và tên không được vượt quá 255 ký tự'),
  phone: z.string().refine((val) => val === '' || VIETNAM_PHONE_REGEX.test(val), {
    message: PHONE_INVALID_MESSAGE,
  }),
})
export type ProfileValues = z.infer<typeof profileSchema>
