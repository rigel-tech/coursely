/**
 * Zod schema for editing a student's own profile. Validates only — trimming a full name
 * and mapping a blank phone to `null` for storage is `updateProfileAction`'s job, not a
 * transform buried in here, so the same schema drives `<ProfileForm>`'s `zodResolver`
 * directly.
 */
import { z } from 'zod'

const VIETNAM_PHONE_REGEX = /^(?:(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9]))\d{7}$/

export const profileSchema = z.object({
  fullName: z.string().max(255, 'Họ và tên không được vượt quá 255 ký tự'),
  phone: z.string().refine((val) => val === '' || VIETNAM_PHONE_REGEX.test(val), {
    message: 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)',
  }),
})

export type ProfileValues = z.infer<typeof profileSchema>
