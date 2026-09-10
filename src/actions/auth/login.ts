'use server'

import { cookies } from 'next/headers'

import { PENDING_EMAIL_COOKIE, PENDING_EMAIL_TTL_SEC } from '@/lib/constants/auth'
import { parseLoginInput } from '@/lib/validation/login-schema'
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
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = parseLoginInput({
    email: formData.get('email'),
    password: formData.get('password'),
    rememberMe: formData.get('rememberMe'),
    callbackUrl: formData.get('callbackUrl'),
  })
  if (!parsed.success) {
    // Return specific field errors for inline UI feedback alongside fallback message.
    return {
      status: 'error',
      code: 'AUTH_021',
      message: BAD_CREDENTIALS,
      fieldErrors: parsed.fieldErrors,
    }
  }

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
      return {
        status: 'error',
        code: 'AUTH_022',
        message: result.message,
        redirectTo: result.redirectTo,
      }
    }
    return { status: 'error', code: result.code, message: result.message }
  }

  setSessionCookies(await cookies(), result.student, { rememberMe: result.rememberMe })

  return { status: 'success', redirectTo: result.redirectTo }
}
