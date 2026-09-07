/**
 * The `coursely-token` cookie — the student surface's session cookie — written
 * and cleared through one place so the flags never drift between the login action
 * and the logout actions. The setter type is structural: it fits both the
 * `next/headers` `cookies()` jar and `NextResponse.cookies`.
 *
 * The value is a Payload session JWT (same secret and `users_sessions` backing as
 * the admin `payload-token`); only the cookie name keeps the two surfaces apart.
 */
import { STUDENT_TOKEN_COOKIE } from '@/lib/constants/auth'

type CookieSetter = {
  set(name: string, value: string, options?: Record<string, unknown>): unknown
  delete(name: string): unknown
}

const baseFlags = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

/** Set `coursely-token`. `maxAgeSec` should be Payload's `tokenExpiration`. */
export function setStudentCookie(jar: CookieSetter, token: string, maxAgeSec: number): void {
  jar.set(STUDENT_TOKEN_COOKIE, token, { ...baseFlags, maxAge: maxAgeSec })
}

export function clearStudentCookie(jar: CookieSetter): void {
  jar.delete(STUDENT_TOKEN_COOKIE)
}
