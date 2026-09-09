'use server'

import { cookies } from 'next/headers'

import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth'
import { clearSessionCookies } from '@/lib/auth/session-cookies'
import { findSessionByRefresh, revokeSession } from '@/services/session-store'

/**
 * Sign out of the current device (§ access+refresh sessions). Resolves the
 * session from the `coursely-refresh` cookie itself — never from `x-user-*`,
 * which a caller could carry from a different tab — revokes it, clears both
 * cookies, and returns `redirectTo` for the client to navigate (it must not
 * `redirect()` in the same pass — see INVARIANTS).
 *
 * Revoking kills the refresh token immediately; the access token is stateless
 * and stays signature-valid until it expires. That is harmless here because the
 * cookie is cleared from this browser in the same call.
 */
export async function logoutAction(): Promise<{ redirectTo: string }> {
  const jar = await cookies()
  const refresh = jar.get(REFRESH_TOKEN_COOKIE)?.value

  if (refresh) {
    const found = await findSessionByRefresh(refresh)
    if (found) await revokeSession(found.sid)
  }

  clearSessionCookies(jar)
  return { redirectTo: '/' }
}
