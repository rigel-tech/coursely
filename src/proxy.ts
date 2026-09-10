import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import {
  ACCESS_TOKEN_COOKIE,
  AUTH_TOKEN_COOKIE,
  PENDING_EMAIL_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/constants/auth'
import { decideRoute } from '@/lib/auth/route-guard'
import { verifyAuthToken, type AuthUser } from '@/lib/auth/verify-token'
import { verifyAccessToken, verifyRefreshToken, type StudentClaims } from '@/lib/auth/session-token'
import { clearSessionCookies, refreshAccessCookie } from '@/lib/auth/session-cookies'

/**
 * Auth guard (Next 16 Proxy, formerly Middleware — Node runtime). Gates `/admin`,
 * the student area and `/xac-thuc-otp`. It decides routing and cookies only: the
 * request headers pass through untouched, so nothing this file learns about the
 * visitor reaches a Server Component. Server code asks `getStudentSession`;
 * public UI asks `/next/auth-status` from the browser (see INVARIANTS).
 *
 * Two identity sources, split by area:
 *   `/admin*`  — Payload's `payload-token`, verified with no DB hit.
 *   elsewhere  — the `coursely-access` token. When it is absent or expired, a
 *                valid `coursely-refresh` mints a replacement right here. Both
 *                tokens are self-contained, so this costs no I/O at all and the
 *                refresh cookie is left exactly as it was. A refresh cookie that
 *                does not verify means signed out, and both cookies are cleared.
 */
const jwtSecret = createHash('sha256')
  .update(process.env.PAYLOAD_SECRET ?? '')
  .digest('hex')
  .slice(0, 32)

/** The visitor, plus what the response owes the session cookies. */
type Identity = {
  user: AuthUser | StudentClaims | null
  /** The access cookie must be re-minted from these claims. */
  renew?: StudentClaims
  /** A refresh cookie was presented and did not verify — drop both. */
  clear?: true
}

const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/')

function resolveIdentity(request: NextRequest): Identity {
  if (isAdminPath(request.nextUrl.pathname)) {
    return { user: verifyAuthToken(request.cookies.get(AUTH_TOKEN_COOKIE)?.value, jwtSecret) }
  }

  const student = verifyAccessToken(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value)
  if (student) return { user: student }

  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshCookie) return { user: null }

  const renewed = verifyRefreshToken(refreshCookie)
  return renewed ? { user: renewed, renew: renewed } : { user: null, clear: true }
}

export function proxy(request: NextRequest): NextResponse {
  const { user, renew, clear } = resolveIdentity(request)

  const decision = decideRoute(
    request.nextUrl.pathname,
    user,
    request.cookies.has(PENDING_EMAIL_COOKIE),
  )

  const response =
    decision.type === 'redirect'
      ? NextResponse.redirect(new URL(decision.to, request.url))
      : NextResponse.next()

  // A renewal must reach the browser even if the request then redirects for an
  // unrelated reason.
  if (renew) refreshAccessCookie(response.cookies, renew)
  else if (clear) clearSessionCookies(response.cookies)

  return response
}

export const config = {
  // Every page, but not Next internals, static assets or the Payload REST API.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|api/).*)'],
}
