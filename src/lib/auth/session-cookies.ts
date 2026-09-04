/**
 * The `coursely-access` / `coursely-refresh` cookie pair, written and cleared
 * through one place so the flags never drift between the login action, the OTP
 * action, the logout actions, and `proxy`'s inline renewal. The setter type is
 * structural: it fits both the `next/headers` `cookies()` jar and
 * `NextResponse.cookies`.
 */
import type { IssuedSession } from '@/services/session-store'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth'

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

/** Access cookie is always a session cookie; the refresh cookie carries `maxAge` only with "remember me". */
export function setSessionCookies(jar: CookieSetter, issued: IssuedSession): void {
  jar.set(ACCESS_TOKEN_COOKIE, issued.accessJwt, { ...baseFlags })
  jar.set(REFRESH_TOKEN_COOKIE, issued.refreshRaw, {
    ...baseFlags,
    ...(issued.refreshCookieMaxAge ? { maxAge: issued.refreshCookieMaxAge } : {}),
  })
}

export function clearSessionCookies(jar: CookieSetter): void {
  jar.delete(ACCESS_TOKEN_COOKIE)
  jar.delete(REFRESH_TOKEN_COOKIE)
}
