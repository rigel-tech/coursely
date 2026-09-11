'use server'

import { cookies } from 'next/headers'

import { PENDING_EMAIL_COOKIE, PENDING_EMAIL_TTL_SEC } from '@/lib/constants/auth'
import { loginInputSchema, type LoginInput } from '@/lib/validation/login-schema'
import { authenticateStudent } from '@/services/student-login'
import { setSessionCookies } from '@/lib/auth/session-cookies'
import type { LoginState } from '@/lib/constants/login-state'

const BAD_CREDENTIALS = 'Email hoặc mật khẩu không đúng.'

/**
 * Server action for login (§7). Orchestration only: validate, delegate to
 * `authenticateStudent`, then translate the result into the `coursely-access` /
 * `coursely-refresh` cookies + `redirectTo` for `<LoginForm>` to act on. It never
 * calls `redirect()` itself — setting an auth cookie and redirecting in the same
 * action drops the cookie, so the client owns the navigation.
 *
 * It takes a plain object, not a `FormData`: the form is a `react-hook-form` one and
 * calls this directly. `loginInputSchema` still runs — the type says nothing at runtime
 * about what a hand-built request sends, and the schema is where `callbackUrl` is made
 * safe to redirect to.
 */
export async function loginAction(input: LoginInput): Promise<LoginState> {
  const parsed = loginInputSchema.safeParse(input)
  // A malformed field is still just "wrong credentials" here: the form already
  // reported it per-field, and a caller that skipped the form has no UI to tell.
  if (!parsed.success) return { status: 'error', message: BAD_CREDENTIALS }

  let result
  try {
    result = await authenticateStudent(parsed.data)
  } catch (err) {
    console.error('loginAction failed', err)
    return { status: 'error', message: 'Có lỗi hệ thống. Vui lòng thử lại sau.' }
  }

  if (!result.ok) {
    if (result.code === 'AUTH_022') {
      // Account exists but unverified — hand the OTP flow its cookie and route.
      ;(await cookies()).set(PENDING_EMAIL_COOKIE, result.email, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: PENDING_EMAIL_TTL_SEC,
        secure: process.env.NODE_ENV === 'production',
      })
      return { status: 'error', message: result.message, redirectTo: result.redirectTo }
    }
    return { status: 'error', message: result.message }
  }

  setSessionCookies(await cookies(), result.student)

  return { status: 'success', redirectTo: result.redirectTo }
}
