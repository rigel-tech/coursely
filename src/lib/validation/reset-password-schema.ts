/**
 * Zod schema for "reset password" (the link from the forgot-password email), the same
 * shape `register-schema.ts` uses: a shared base plus one refine reused by both the field
 * rules the form owns and the fuller set `resetPasswordAction` re-checks.
 *
 * `resetPasswordFormSchema` covers the two fields `<ResetPasswordForm>` renders. The token
 * is not one of them — it comes off the URL, not something the person types, and the page
 * shows a different card entirely when it is missing — so it is absent from the form's own
 * `zodResolver` and only appears in `resetPasswordSchema`, which is what the action
 * validates directly.
 */
import { z } from 'zod'

const PASSWORD_MESSAGE = 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số'

const passwordRule = z
  .string()
  .min(8, PASSWORD_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_MESSAGE)
  .regex(/\d/, PASSWORD_MESSAGE)

const passwordsMatch = (d: { password: string; confirmPassword: string }) =>
  d.password === d.confirmPassword

const PASSWORDS_MATCH_ISSUE = { path: ['confirmPassword'], error: 'Mật khẩu xác nhận không khớp' }

/** Drives `<ResetPasswordForm>`'s `zodResolver`. */
export const resetPasswordFormSchema = z
  .object({ password: passwordRule, confirmPassword: z.string() })
  .refine(passwordsMatch, PASSWORDS_MATCH_ISSUE)

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

/** What `resetPasswordAction` re-checks — the only check that counts, since the form can
 * be bypassed. `safeParse` runs directly against this; there is no wrapper function. */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Mã xác thực không hợp lệ hoặc bị thiếu'),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, PASSWORDS_MATCH_ISSUE)

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
