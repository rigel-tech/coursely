import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { AUTH_TOKEN_COOKIE, PENDING_EMAIL_COOKIE, STUDENT_TOKEN_COOKIE } from '@/lib/constants/auth'
import { decideRoute } from '@/lib/auth/route-guard'
import { verifyAuthToken } from '@/lib/auth/verify-token'

/**
 * Auth guard (Next 16 Proxy, formerly Middleware — Node runtime). Gates `/admin`,
 * the student area and `/xac-thuc-otp`, and forwards the identity to Server
 * Components through `x-user-*` request headers, which are always rewritten so a
 * client cannot forge them.
 *
 * Identity is split by area: `/admin*` reads the admin `payload-token`, every
 * other route reads the student `coursely-token`. Both are Payload session JWTs
 * verified here with no DB hit — same secret, `id` plus the `saveToJWT` fields
 * (`role`, `status`). A stateless verify cannot see a session revoked but not yet
 * expired — acceptable for a routing gate, since every real Payload API call
 * re-checks the `users_sessions` row.
 */
const jwtSecret = createHash('sha256')
  .update(process.env.PAYLOAD_SECRET ?? '')
  .digest('hex')
  .slice(0, 32)

const USER_HEADERS = ['x-user-id', 'x-user-role', 'x-user-status']

type GuardUser = { id: number; role?: string; status?: string }

function withUserHeaders(request: NextRequest, user: GuardUser | null): NextResponse {
  const headers = new Headers(request.headers)
  for (const h of USER_HEADERS) headers.delete(h)
  if (user) {
    headers.set('x-user-id', String(user.id))
    if (user.role) headers.set('x-user-role', user.role)
    if (user.status) headers.set('x-user-status', user.status)
  }
  return NextResponse.next({ request: { headers } })
}

const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/')

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const cookieName = isAdminPath(request.nextUrl.pathname)
    ? AUTH_TOKEN_COOKIE
    : STUDENT_TOKEN_COOKIE
  const user = verifyAuthToken(request.cookies.get(cookieName)?.value, jwtSecret)

  const decision = decideRoute(
    request.nextUrl.pathname,
    user,
    request.cookies.has(PENDING_EMAIL_COOKIE),
  )

  return decision.type === 'redirect'
    ? NextResponse.redirect(new URL(decision.to, request.url))
    : withUserHeaders(request, user)
}

export const config = {
  // Every page, but not Next internals, static assets or the Payload REST API.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|api/).*)'],
}
