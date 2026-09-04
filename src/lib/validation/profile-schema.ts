import { z } from 'zod'

const VIETNAM_PHONE_REGEX = /^(?:(?:\+84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9]))\d{7}$/

export const profileSchema = z.object({
  fullName: z
    .string()
    .max(255, 'Họ và tên không được vượt quá 255 ký tự')
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  phone: z
    .string()
    .optional()
    .transform((val) => (val ? val.trim() : ''))
    .refine((val) => val === '' || VIETNAM_PHONE_REGEX.test(val), {
      message: 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)',
    })
    .transform((val) => (val === '' ? null : val)),
})

export type ProfileInput = z.infer<typeof profileSchema>

export type ProfileValidationResult =
  { ok: true; data: ProfileInput } | { ok: false; errors: Record<string, string> }

export function parseProfileInput(raw: Record<string, unknown>): ProfileValidationResult {
  const parsed = profileSchema.safeParse(raw)

  if (parsed.success) {
    return {
      ok: true,
      data: parsed.data,
    }
  }

  const errors: Record<string, string> = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !errors[field]) {
      errors[field] = issue.message
    }
  }

  return {
    ok: false,
    errors,
  }
}
