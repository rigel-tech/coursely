import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { AUTH_TOKEN_COOKIE, PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'
import { decideRoute } from '@/lib/auth/route-guard'
import { verifyAuthToken } from '@/lib/auth/verify-token'

/**
 * Auth guard (Next 16 Proxy, formerly Middleware — Node runtime). Verifies
 * Payload's `payload-token` cookie without a DB hit, gates `/admin`, the student
 * area and `/verify-otp`, and forwards the identity to Server Components through
 * `x-user-*` request headers. Those headers are always rewritten so a client
 * cannot forge them.
 */
const jwtSecret = createHash('sha256')
  .update(process.env.PAYLOAD_SECRET ?? '')
  .digest('hex')
  .slice(0, 32)

const USER_HEADERS = ['x-user-id', 'x-user-role', 'x-user-status']

export function proxy(request: NextRequest): NextResponse {
  const user = verifyAuthToken(request.cookies.get(AUTH_TOKEN_COOKIE)?.value, jwtSecret)

  const decision = decideRoute(
    request.nextUrl.pathname,
    user,
    request.cookies.has(PENDING_EMAIL_COOKIE),
  )
  if (decision.type === 'redirect') {
    return NextResponse.redirect(new URL(decision.to, request.url))
  }

  const headers = new Headers(request.headers)
  for (const h of USER_HEADERS) headers.delete(h)
  if (user) {
    headers.set('x-user-id', String(user.id))
    if (user.role) headers.set('x-user-role', user.role)
    if (user.status) headers.set('x-user-status', user.status)
  }
  return NextResponse.next({ request: { headers } })
}

export const config = {
  // Every page, but not Next internals, static assets or the Payload REST API.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|api/).*)'],
}
