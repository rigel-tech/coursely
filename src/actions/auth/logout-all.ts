'use server'

import { cookies } from 'next/headers'

import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth'
import { clearSessionCookies } from '@/lib/auth/session-cookies'
import { findSessionByRefresh, revokeAllForUser } from '@/services/session-store'

/**
 * Sign out of every device (§ access+refresh sessions). Like `logoutAction` but
 * resolves the account from the `coursely-refresh` cookie and revokes every
 * session on it — the invoking one included. Returns `redirectTo`; never
 * `redirect()` (see INVARIANTS).
 *
 * Other devices lose their refresh token at once, but their access token is
 * stateless: each keeps working until it expires (`ACCESS_TTL_SEC`). Sign-out
 * everywhere is therefore immediate for renewal and bounded for reads.
 */
export async function logoutAllAction(): Promise<{ redirectTo: string }> {
  const jar = await cookies()
  const refresh = jar.get(REFRESH_TOKEN_COOKIE)?.value

  if (refresh) {
    const found = await findSessionByRefresh(refresh)
    if (found) await revokeAllForUser(found.userId)
  }

  clearSessionCookies(jar)
  return { redirectTo: '/' }
}
