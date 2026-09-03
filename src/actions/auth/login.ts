'use server'

import { cookies, headers } from 'next/headers'

import {
  AUTH_TOKEN_COOKIE,
  PENDING_EMAIL_COOKIE,
  PENDING_EMAIL_TTL_SEC,
  REMEMBER_ME_MAX_AGE_SEC,
} from '@/lib/constants/auth'
import { parseLoginInput } from '@/lib/validation/login-schema'
import { authenticateUser } from '@/services/login'
import type { LoginState } from '@/lib/constants/login-state'

const BAD_CREDENTIALS = 'Email hoặc mật khẩu không đúng.'

/**
 * Server action for login (§7). Orchestration only: read request context,
 * validate, delegate to `authenticateUser`, then translate the result into
 * cookies + `redirectTo` for `<LoginForm>` to act on. It never calls `redirect()`
 * itself — setting the JWT cookie and redirecting in the same action drops the
 * cookie, so the client owns the navigation.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  const userAgent = h.get('user-agent') || 'unknown'

  const parsed = parseLoginInput({
    email: formData.get('email'),
    password: formData.get('password'),
    rememberMe: formData.get('rememberMe'),
    callbackUrl: formData.get('callbackUrl'),
  })
  if (!parsed.success) {
    // A malformed field is still just "wrong credentials" to the user.
    return {
      status: 'error',
      code: 'AUTH_021',
      message: BAD_CREDENTIALS,
      fieldErrors: parsed.fieldErrors,
    }
  }

  let result
  try {
    result = await authenticateUser(parsed.data, { ip, userAgent })
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

  ;(await cookies()).set(AUTH_TOKEN_COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    // rememberMe → 30 days; otherwise a session cookie (no maxAge).
    ...(result.rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SEC } : {}),
  })

  return { status: 'success', redirectTo: result.redirectTo }
}
