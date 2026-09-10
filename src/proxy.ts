import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import {
  ACCESS_TOKEN_COOKIE,
  AUTH_TOKEN_COOKIE,
  PENDING_EMAIL_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/constants/auth'
import { decideRoute } from '@/lib/auth/route-guard'
import { verifyAuthToken } from '@/lib/auth/verify-token'
import { verifyAccessToken } from '@/lib/auth/access-token'
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/session-cookies'
import { renewSession, type IssuedSession } from '@/services/session-store'

/**
 * Auth guard (Next 16 Proxy, formerly Middleware — Node runtime). Gates `/admin`,
 * the student area and `/xac-thuc-otp`. It decides routing and cookies only: the
 * request headers pass through untouched, so nothing this file learns about the
 * visitor reaches a Server Component. Server code asks `getStudentSession`;
 * public UI asks `/next/auth-status` from the browser (see INVARIANTS).
 *
 * Two identity sources, split by area:
 *   `/admin*`  — Payload's `payload-token`, verified with no DB hit (unchanged).
 *   elsewhere  — the stateless `coursely-access` token. When it is absent/expired
 *                but a `coursely-refresh` cookie is held, this guard renews the
 *                session inline (the only Redis read on the request path) and
 *                writes fresh cookies on the response. A renewal failure — stale
 *                token, detected reuse, or Redis down — is treated as signed out
 *                and the student cookies are cleared (fail closed).
 */
const jwtSecret = createHash('sha256')
  .update(process.env.PAYLOAD_SECRET ?? '')
  .digest('hex')
  .slice(0, 32)

type GuardUser = { id: number; status?: string }
type Identity = { user: GuardUser | null; renewed?: IssuedSession; clearStudent?: boolean }

const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/')

async function resolveIdentity(request: NextRequest): Promise<Identity> {
  if (isAdminPath(request.nextUrl.pathname)) {
    return { user: verifyAuthToken(request.cookies.get(AUTH_TOKEN_COOKIE)?.value, jwtSecret) }
  }

  const claims = verifyAccessToken(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value)
  if (claims) return { user: claims }

  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refresh) return { user: null }

  try {
    const renewed = await renewSession(refresh, {
      ip:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })
    return renewed.ok ? { user: renewed.user, renewed } : { user: null, clearStudent: true }
  } catch (err) {
    console.error('proxy renewal failed', err)
    return { user: null, clearStudent: true }
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { user, renewed, clearStudent } = await resolveIdentity(request)

  const decision = decideRoute(
    request.nextUrl.pathname,
    user,
    request.cookies.has(PENDING_EMAIL_COOKIE),
  )

  const response =
    decision.type === 'redirect'
      ? NextResponse.redirect(new URL(decision.to, request.url))
      : NextResponse.next()

  // A renewal that happened must reach the browser even if the request then
  // redirects for an unrelated reason.
  if (renewed) setSessionCookies(response.cookies, renewed)
  else if (clearStudent) clearSessionCookies(response.cookies)

  return response
}

export const config = {
  // Every page, but not Next internals, static assets or the Payload REST API.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|api/).*)'],
}
