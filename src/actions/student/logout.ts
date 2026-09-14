'use server'

import { cookies } from 'next/headers'

import { clearSessionCookies } from '@/lib/auth/session-cookies'

/**
 * Sign out of this device. Both tokens live entirely in the cookies, so dropping
 * them is the whole of it — there is no record to revoke and nothing to read.
 *
 * It returns `redirectTo` instead of calling `redirect()`: clearing a cookie and
 * redirecting in the same pass loses the `Set-Cookie` (see INVARIANTS), so the
 * client owns the navigation.
 *
 * A copy of either token taken off this browser keeps working until it expires.
 * That is the trade the stateless design makes, and it is why the refresh token's
 * lifetime is the only bound on a session.
 */
export async function logoutAction(): Promise<{ redirectTo: string }> {
  clearSessionCookies(await cookies())
  return { redirectTo: '/' }
}
