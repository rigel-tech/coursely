'use server'

import { cookies } from 'next/headers'
import { AuthenticationError } from 'payload'

import { PENDING_EMAIL_COOKIE, PENDING_EMAIL_TTL_SEC } from '@/lib/constants/auth'
import { loginInputSchema, type LoginInput } from '@/lib/validation/login-schema'
import { authenticateStudent } from '@/services/student-login'
import { EmailNotVerified, LoginRefused } from '@/lib/errors/auth'
import { setSessionCookies } from '@/lib/auth/session-cookies'
import type { LoginState } from '@/lib/constants/login-state'

const BAD_CREDENTIALS = 'Email hoặc mật khẩu không đúng.'

/**
 * Server action for login (§7). Orchestration only: validate, delegate to
 * `authenticateStudent`, then translate what comes back into the `coursely-access` /
 * `coursely-refresh` cookies + `redirectTo` for `<LoginForm>` to act on. It never calls
 * `redirect()` itself — setting an auth cookie and redirecting in the same action drops
 * the cookie, so the client owns the navigation.
 *
 * It takes a plain object, not a `FormData`: the form is a `react-hook-form` one and
 * calls this directly. `loginInputSchema` still runs — the type says nothing at runtime
 * about what a hand-built request sends, and the schema is where `callbackUrl` is made
 * safe to redirect to.
 *
 * This is the one place a login failure becomes copy. Each branch is an `instanceof` on
 * an error the service is documented to throw; anything else leaves by `throw`, because
 * an error nobody wrote a message for is a bug, and turning it into "please try again"
 * hides it forever. `<LoginForm>` catches that and shows a system-failure banner.
 */
export async function loginAction(input: LoginInput): Promise<LoginState> {
  const parsed = loginInputSchema.safeParse(input)
  // A malformed field is still just "wrong credentials" here: the form already reported
  // it per-field, and a caller that skipped the form has no UI to tell.
  if (!parsed.success) return { status: 'error', message: BAD_CREDENTIALS }

  try {
    const { student, redirectTo } = await authenticateStudent(parsed.data)
    await setSessionCookies(await cookies(), student)

    return { status: 'success', redirectTo }
  } catch (err) {
    if (err instanceof EmailNotVerified) return bounceToVerification(err)
    // §7 — a wrong address and a wrong password are reported identically, so Payload's
    // own English copy never reaches the form.
    if (err instanceof AuthenticationError) return { status: 'error', message: BAD_CREDENTIALS }
    if (err instanceof LoginRefused) return { status: 'error', message: err.message }

    throw err
  }
}

/** Hand the OTP flow the address it needs and the route to it. */
async function bounceToVerification(err: EmailNotVerified): Promise<LoginState> {
  ;(await cookies()).set(PENDING_EMAIL_COOKIE, err.email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_EMAIL_TTL_SEC,
    secure: process.env.NODE_ENV === 'production',
  })

  return { status: 'error', message: err.message, redirectTo: '/xac-thuc-otp' }
}
