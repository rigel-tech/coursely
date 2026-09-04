import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email không được để trống').email('Email không đúng định dạng'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export type ForgotPasswordValidationResult =
  | { success: true; data: ForgotPasswordInput }
  | { success: false; fieldErrors: Record<string, string> }

export function parseForgotPasswordInput(
  raw: Record<string, unknown>,
): ForgotPasswordValidationResult {
  const parsed = forgotPasswordSchema.safeParse({
    email: raw.email,
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
