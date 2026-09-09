/**
 * Pure routing decision for `proxy` (§ auth guard). Kept out of `proxy.ts` so it
 * can be unit-tested without constructing a `NextRequest`.
 */
import { PROTECTED_PREFIXES } from '@/lib/constants/auth'
import type { AuthUser } from '@/lib/auth/verify-token'

export type RouteDecision = { type: 'next' } | { type: 'redirect'; to: string }

const NEXT: RouteDecision = { type: 'next' }

export function decideRoute(
  pathname: string,
  user: AuthUser | null,
  hasPendingEmail: boolean,
): RouteDecision {
  // No `/admin` branch. `verifyAuthToken` rejects any token whose `collection` claim
  // is not `users`, so a student reaches this function as `null` and Payload's own
  // `canAccessAdmin` — backed by `Students.access.admin` — is what refuses the panel.
  // Routing was never authorisation; it only looked like it.

  // OTP step needs the cookie `registerAction` / AUTH_022 set.
  if (pathname === '/xac-thuc-otp') {
    return hasPendingEmail ? NEXT : { type: 'redirect', to: '/' }
  }

  // Student area: signed in and verified.
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (user && user.status === 'ACTIVE') return NEXT
    return { type: 'redirect', to: `/dang-nhap?callbackUrl=${encodeURIComponent(pathname)}` }
  }

  return NEXT
}
