import { PROTECTED_PREFIXES, AUTH_PREFIXES } from '@/lib/constants/auth'

export type RoutePrincipal = { id: number; status?: string }
export type RouteDecision = { type: 'next' } | { type: 'redirect'; to: string }

const NEXT: RouteDecision = { type: 'next' }

export function decideRoute(
  pathname: string,
  user: RoutePrincipal | null,
  hasPendingEmail: boolean,
): RouteDecision {
  if (AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (user && user.status === 'ACTIVE') {
      return { type: 'redirect', to: '/' }
    }
  }

  if (pathname === '/xac-thuc-otp') {
    return hasPendingEmail ? NEXT : { type: 'redirect', to: '/' }
  }

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (user && user.status === 'ACTIVE') return NEXT
    return { type: 'redirect', to: `/dang-nhap?callbackUrl=${encodeURIComponent(pathname)}` }
  }

  return NEXT
}
