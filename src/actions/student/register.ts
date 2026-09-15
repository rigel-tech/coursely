'use server'

import { cookies } from 'next/headers'

import { PENDING_EMAIL_COOKIE, PENDING_EMAIL_TTL_SEC } from '@/lib/constants/auth'
import { registerInputSchema, type RegisterValues } from '@/lib/validation/register-schema'
import { registerStudent } from '@/services/student-registration'
import type { RegisterState } from '@/lib/constants/register-state'

/**
 * Server action for self-registration (§5.1). Orchestration only: validate, delegate to
 * `registerStudent`, then translate the result into either a duplicate-email field error
 * or a `pending_email` cookie + `{ status: 'success' }`.
 *
 * It takes a plain object, not a `FormData`: the form is a `react-hook-form` one and calls
 * this directly, the same as `loginAction`. `registerInputSchema.safeParse` runs directly
 * here, the same as `loginAction` runs `loginInputSchema.safeParse` — the type says nothing
 * at runtime about what a hand-built request sends, and a rejection here means a caller
 * bypassed the form, so one flat message is all there is to show it.
 *
 * An unexpected failure leaves by `throw`, the same way `loginAction` does. Turning it into
 * "please try again" here would hide it forever; `<RegisterForm>` catches it and shows a
 * system-failure banner.
 *
 * The redirect to `/xac-thuc-otp` is the client's job: redirecting from here races the
 * `Set-Cookie`, so the target page can load before the cookie exists and bounce straight back.
 */
export async function registerAction(input: RegisterValues): Promise<RegisterState> {
  const parsed = registerInputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: 'Vui lòng kiểm tra lại thông tin đã nhập.' }
  }

  const result = await registerStudent(parsed.data)
  if (!result.ok) {
    return { status: 'error', field: 'email', message: 'Email đã tồn tại.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(PENDING_EMAIL_COOKIE, result.email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_EMAIL_TTL_SEC,
    secure: process.env.NODE_ENV === 'production',
  })

  return { status: 'success' }
}
