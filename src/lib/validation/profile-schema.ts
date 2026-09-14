/**
 * Zod schema for a student's own profile fields (full name, phone). `makeProfileSchema`
 * is the one definition of what a valid value looks like; `{ required: true }` is the
 * stricter reading `specs/009-enrollment-profile-completeness` needs (non-blank, trimmed)
 * without forking the rule into a second, drifting copy. `profileSchema` — used by
 * `/tai-khoan`'s `<ProfileForm>` — is `makeProfileSchema()` with no options, so its
 * behaviour (blank allowed, untrimmed) is unchanged.
 */
import { z } from 'zod'

export const VIETNAM_PHONE_REGEX = /^(?:(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9]))\d{7}$/

const PHONE_INVALID_MESSAGE = 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)'

export const makeProfileSchema = (options?: { required?: boolean }) => {
  const required = options?.required ?? false

  return z.object({
    fullName: required
      ? z
          .string()
          .trim()
          .min(1, 'Vui lòng nhập họ và tên.')
          .max(255, 'Họ và tên không được vượt quá 255 ký tự')
      : z.string().max(255, 'Họ và tên không được vượt quá 255 ký tự'),
    phone: required
      ? z
          .string()
          .trim()
          .min(1, 'Vui lòng nhập số điện thoại.')
          .refine((val) => VIETNAM_PHONE_REGEX.test(val), { message: PHONE_INVALID_MESSAGE })
      : z.string().refine((val) => val === '' || VIETNAM_PHONE_REGEX.test(val), {
          message: PHONE_INVALID_MESSAGE,
        }),
  })
}

export const profileSchema = makeProfileSchema()
export type ProfileValues = z.infer<typeof profileSchema>
