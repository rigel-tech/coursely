/**
 * Zod schema + FormData adapter for self-registration (§5.1 step 2).
 *
 * `parseRegisterInput` takes the raw string bag from a `FormData` and returns
 * either the normalised input or `fieldErrors` keyed by form control name, so the
 * client can highlight each offending input.
 */
import { z } from 'zod'

const PASSWORD_MESSAGE = 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số'

const schema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập địa chỉ email')
      .email('Email không đúng định dạng (ví dụ: ten@example.com)'),
    password: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu')
      .min(8, PASSWORD_MESSAGE)
      .regex(/[A-Za-z]/, PASSWORD_MESSAGE)
      .regex(/\d/, PASSWORD_MESSAGE),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    terms: z.literal('on', { error: 'Bạn cần đồng ý với điều khoản sử dụng' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Mật khẩu nhập lại không khớp với mật khẩu đã nhập',
  })

export type RegisterFieldErrors = Partial<
  Record<'email' | 'password' | 'confirmPassword' | 'terms', string>
>

export type RegisterInput = {
  email: string
  password: string
  fullName?: string
  phone?: string
}

export type ParseResult =
  { success: true; data: RegisterInput } | { success: false; fieldErrors: RegisterFieldErrors }

export function parseRegisterInput(raw: Record<string, unknown>): ParseResult {
  const parsed = schema.safeParse({
    email: raw.email,
    password: raw.password,
    confirmPassword: raw.confirmPassword,
    fullName: raw.fullName,
    phone: raw.phone,
    terms: raw.terms,
  })

  if (parsed.success) {
    const { email, password, fullName, phone } = parsed.data
    return {
      success: true,
      data: {
        email,
        password,
        fullName: fullName?.trim() || undefined,
        phone: phone?.trim() || undefined,
      },
    }
  }

  const flat = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>
  const fieldErrors: RegisterFieldErrors = {}
  for (const key of ['email', 'password', 'confirmPassword', 'terms'] as const) {
    const first = flat[key]?.[0]
    if (first) fieldErrors[key] = first
  }
  return { success: false, fieldErrors }
}
