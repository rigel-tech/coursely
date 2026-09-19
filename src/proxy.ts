import { NextResponse, type NextRequest } from 'next/server'

import {
  ACCESS_TOKEN_COOKIE,
  PENDING_EMAIL_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/lib/constants/auth'
import { decideRoute, type RoutePrincipal } from '@/lib/auth/route-guard'
import { verifyAccessToken, verifyRefreshToken, type StudentClaims } from '@/lib/auth/session-token'
import { clearSessionCookies, refreshAccessCookie } from '@/lib/auth/session-cookies'

/**
 * Auth guard (Next 16 Proxy, formerly Middleware — Node runtime). Gates the student
 * area and `/xac-thuc-otp`. It decides routing and cookies only: the request headers
 * pass through untouched, so nothing this file learns about the visitor reaches a
 * Server Component. Server code asks `getSessionStudent`; public UI asks
 * `/next/auth-status` from the browser (see INVARIANTS).
 *
 * `/admin` is deliberately not gated here and is an ordinary path to this file.
 * Payload's own `RootPage` checks `permissions.canAccessAdmin` on every request and
 * redirects to `/admin/login`, and `Students.access.admin` is `() => false` — so a
 * student is refused the panel whatever this file believes. Duplicating that check
 * from the `payload-token` cookie only adds a second, weaker copy of the rule.
 *
 * One identity source, then: the `coursely-access` token. When it is absent or
 * expired, a valid `coursely-refresh` mints a replacement right here. Both tokens are
 * self-contained, so this costs no I/O at all and the refresh cookie is left exactly
 * as it was. A refresh cookie that does not verify means signed out, and both cookies
 * are cleared.
 */

/** The visitor, plus what the response owes the session cookies. */
type Identity = {
  user: RoutePrincipal | null
  /** The access cookie must be re-minted from these claims. */
  renew?: StudentClaims
  /** A refresh cookie was presented and did not verify — drop both. */
  clear?: true
}

async function resolveIdentity(request: NextRequest): Promise<Identity> {
  const student = await verifyAccessToken(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value)
  if (student) return { user: student }

  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshCookie) return { user: null }

  const renewed = await verifyRefreshToken(refreshCookie)
  return renewed ? { user: renewed, renew: renewed } : { user: null, clear: true }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { user, renew, clear } = await resolveIdentity(request)

  // A Server Action POST (Next sends `next-action` on every one) must reach its own
  // handler even with no valid session. `decideRoute` cannot tell one apart from an
  // ordinary page request, and a redirect response in place of the action's own is
  // followed by the browser with no chance for the calling component to render
  // anything — the person is signed out with no error ever shown. The action's own
  // `getSessionStudent()` check is what turns "no session" into an in-app message.
  const isServerAction = request.headers.has('next-action')

  const decision = isServerAction
    ? { type: 'next' as const }
    : decideRoute(request.nextUrl.pathname, user, request.cookies.has(PENDING_EMAIL_COOKIE))

  const response =
    decision.type === 'redirect'
      ? NextResponse.redirect(new URL(decision.to, request.url))
      : NextResponse.next()

  // A renewal must reach the browser even if the request then redirects for an
  // unrelated reason. `resolveIdentity` never sets both — one is the renewed branch and
  // the other the failed one — so these are two independent guards, not a chain.
  if (renew || clear) {
    if (renew) await refreshAccessCookie(response.cookies, renew)
    if (clear) clearSessionCookies(response.cookies)

    // CRITICAL: Prevent the CDN or Next.js from caching this specific response.
    // If a static page is served and middleware attaches a Set-Cookie header,
    // the CDN might cache the response WITH the Set-Cookie header, leaking the
    // session to subsequent visitors.
    response.headers.set('Cache-Control', 'no-store, max-age=0')
  }

  return response
}

export const config = {
  // Every page, but not Next internals, static assets or the Payload REST API.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|api/).*)'],
}
