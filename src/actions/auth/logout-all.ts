'use server'

import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth'
import { clearSessionCookies } from '@/lib/auth/session-cookies'
import { findSessionByRefresh, revokeAllForUser } from '@/services/session-store'

/**
 * Sign out of every device (§ access+refresh sessions). Like `logoutAction` but
 * resolves the account from the `coursely-refresh` cookie and revokes every
 * session on it — the invoking one included — then records a `LOGOUT_ALL` audit
 * row. Returns `redirectTo`; never `redirect()` (see INVARIANTS).
 */
export async function logoutAllAction(): Promise<{ redirectTo: string }> {
  const jar = await cookies()
  const refresh = jar.get(REFRESH_TOKEN_COOKIE)?.value

  if (refresh) {
    const found = await findSessionByRefresh(refresh)
    if (found) {
      await revokeAllForUser(found.userId)

      const h = await headers()
      const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
      const userAgent = h.get('user-agent') || 'unknown'
      const payload = await getPayload({ config: await configPromise })
      await payload.create({
        collection: 'audit-logs',
        data: { action: 'LOGOUT_ALL', user: found.userId, ip, userAgent },
      })
    }
  }

  clearSessionCookies(jar)
  return { redirectTo: '/' }
}
