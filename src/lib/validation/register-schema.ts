/**
 * Zod schema for self-registration (§5.1 step 2), the same way `login-schema.ts` does it:
 * one schema drives `<RegisterForm>`'s `zodResolver` and the same field rules back
 * `registerInputSchema`, so a password the client accepts is never one the server then
 * rejects. `registerAction` calls `registerInputSchema.safeParse` directly — the same as
 * `loginAction` does with `loginInputSchema` — and reports failure as one message, not a
 * per-field breakdown: the client already validated, so a server-side rejection here means
 * a caller bypassed the form, and that caller has no UI to show field-level detail in.
 *
 * `registerFormSchema` is the four fields the form owns. `registerSchema` adds the
 * password/confirm-password check on top, and is what the form's `zodResolver` runs.
 * `registerInputSchema` extends the same base with what only a non-form caller sends —
 * `phone`, and an optional rather than required `fullName`, both trimmed to `undefined`
 * when blank so a whitespace-only value is never stored — then re-applies the same check,
 * because the form can be bypassed and this is the only one that counts.
 */
import { z } from 'zod'

const PASSWORD_MESSAGE = 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số'

const emailRule = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập địa chỉ email')
  .email('Email không đúng định dạng (ví dụ: ten@example.com)')

const passwordRule = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu')
  .min(8, PASSWORD_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_MESSAGE)
  .regex(/\d/, PASSWORD_MESSAGE)

const passwordsMatch = (d: { password: string; confirmPassword: string }) =>
  d.password === d.confirmPassword

const PASSWORDS_MATCH_ISSUE = {
  path: ['confirmPassword'],
  error: 'Mật khẩu nhập lại không khớp với mật khẩu đã nhập',
}

const registerFormSchema = z.object({
  fullName: z.string().min(1, 'Vui lòng nhập họ và tên'),
  email: emailRule,
  password: passwordRule,
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
})

/** Drives `<RegisterForm>`'s `zodResolver`. `RegisterValues` is inferred from this, not
 * hand-typed, so the two cannot drift apart. */
export const registerSchema = registerFormSchema.refine(passwordsMatch, PASSWORDS_MATCH_ISSUE)

export type RegisterValues = z.infer<typeof registerFormSchema>

const trimmedOrUndefined = z
  .string()
  .optional()
  .transform((v) => v?.trim() || undefined)

/** What `registerAction` re-checks — the only check that counts, since the form can be
 * bypassed. `safeParse` runs directly against this; there is no wrapper function. */
export const registerInputSchema = registerFormSchema
  .extend({ fullName: trimmedOrUndefined, phone: trimmedOrUndefined })
  .refine(passwordsMatch, PASSWORDS_MATCH_ISSUE)

export type RegisterInput = Omit<z.infer<typeof registerInputSchema>, 'confirmPassword'>
