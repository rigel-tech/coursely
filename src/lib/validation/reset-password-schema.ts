import { z } from 'zod'

const PASSWORD_MESSAGE = 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số'

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Mã xác thực không hợp lệ hoặc bị thiếu'),
    password: z
      .string()
      .min(8, PASSWORD_MESSAGE)
      .regex(/[A-Za-z]/, PASSWORD_MESSAGE)
      .regex(/\d/, PASSWORD_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export type ResetPasswordValidationResult =
  | { success: true; data: ResetPasswordInput }
  | { success: false; fieldErrors: Record<string, string> }

export function parseResetPasswordInput(
  raw: Record<string, unknown>,
): ResetPasswordValidationResult {
  const parsed = resetPasswordSchema.safeParse({
    token: raw.token,
    password: raw.password,
    confirmPassword: raw.confirmPassword,
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (typeof field === 'string' && !fieldErrors[field]) {
        fieldErrors[field] = issue.message
      }
    }
    return { success: false, fieldErrors }
  }

  return { success: true, data: parsed.data }
}
