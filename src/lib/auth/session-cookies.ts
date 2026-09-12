/**
 * The `coursely-access` / `coursely-refresh` pair, minted and cleared through one
 * place so the flags never drift between the login action, the OTP action, the
 * logout action and `proxy`'s inline renewal. The jar type is structural: it fits
 * both the `next/headers` `cookies()` jar and `NextResponse.cookies`.
 *
 * The access cookie is always a browser-session cookie — it is short-lived and
 * `proxy` mints a replacement whenever it is missing. The refresh cookie is the one
 * that outlives the browser, and it does so for every session: there is no "remember
 * me" to opt into, so `REFRESH_TTL_SEC` is the session's length, full stop.
 */
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, REFRESH_TTL_SEC } from '@/lib/constants/auth'
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

/** Start a session: both tokens, freshly signed, at the one length every session gets. */
export async function setSessionCookies(jar: CookieJar, claims: StudentClaims): Promise<void> {
  jar.set(ACCESS_TOKEN_COOKIE, await signAccessToken(claims), baseFlags)
  // Cookie and token carry the same lifetime, so a copy taken off the wire does not
  // outlive the cookie it came from.
  jar.set(REFRESH_TOKEN_COOKIE, await signRefreshToken(claims, REFRESH_TTL_SEC), {
    ...baseFlags,
    maxAge: REFRESH_TTL_SEC,
  })
}

/** Renewal writes the access cookie and nothing else — the refresh token is not rotated. */
export async function refreshAccessCookie(jar: CookieJar, claims: StudentClaims): Promise<void> {
  jar.set(ACCESS_TOKEN_COOKIE, await signAccessToken(claims), baseFlags)
}

export function clearSessionCookies(jar: CookieJar): void {
  jar.delete(ACCESS_TOKEN_COOKIE)
  jar.delete(REFRESH_TOKEN_COOKIE)
}
