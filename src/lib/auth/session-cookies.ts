/**
 * The `coursely-access` / `coursely-refresh` pair, minted and cleared through one
 * place so the flags never drift between the login action, the OTP action, the
 * logout action and `proxy`'s inline renewal. The jar type is structural: it fits
 * both the `next/headers` `cookies()` jar and `NextResponse.cookies`.
 *
 * The access cookie is always a browser-session cookie — it is short-lived and
 * `proxy` mints a replacement whenever it is missing. Only the refresh cookie
 * outlives the browser, and only with "remember me".
 */
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_NO_REMEMBER_TTL_SEC,
  REFRESH_TOKEN_COOKIE,
  REMEMBER_ME_MAX_AGE_SEC,
} from '@/lib/constants/auth'
import { signAccessToken, signRefreshToken, type StudentClaims } from '@/lib/auth/session-token'

type CookieJar = {
  set(name: string, value: string, options?: Record<string, unknown>): unknown
  delete(name: string): unknown
}

const baseFlags = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

/** Start a session: both tokens, freshly signed. `rememberMe` sets the session's length. */
export function setSessionCookies(
  jar: CookieJar,
  claims: StudentClaims,
  { rememberMe }: { rememberMe: boolean },
): void {
  jar.set(ACCESS_TOKEN_COOKIE, signAccessToken(claims), baseFlags)
  jar.set(
    REFRESH_TOKEN_COOKIE,
    signRefreshToken(claims, rememberMe ? REMEMBER_ME_MAX_AGE_SEC : REFRESH_NO_REMEMBER_TTL_SEC),
    // Without "remember me" the cookie dies with the browser. The token carries the
    // shorter lifetime too, so a copy taken off the wire does not outlive it either.
    { ...baseFlags, ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_SEC } : {}) },
  )
}

/** Renewal writes the access cookie and nothing else — the refresh token is not rotated. */
export function refreshAccessCookie(jar: CookieJar, claims: StudentClaims): void {
  jar.set(ACCESS_TOKEN_COOKIE, signAccessToken(claims), baseFlags)
}

export function clearSessionCookies(jar: CookieJar): void {
  jar.delete(ACCESS_TOKEN_COOKIE)
  jar.delete(REFRESH_TOKEN_COOKIE)
}
