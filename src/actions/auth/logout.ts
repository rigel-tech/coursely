'use server'

import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth'
import { clearSessionCookies } from '@/lib/auth/session-cookies'
import { findSessionByRefresh, revokeSession } from '@/services/session-store'

/**
 * Sign out of the current device (§ access+refresh sessions). Resolves the
 * session from the `coursely-refresh` cookie itself — never from `x-user-*`,
 * which a caller could carry from a different tab — revokes it, records a
 * `LOGOUT` audit row, clears both cookies, and returns `redirectTo` for the
 * client to navigate (it must not `redirect()` in the same pass — see INVARIANTS).
 */
export async function logoutAction(): Promise<{ redirectTo: string }> {
  const jar = await cookies()
  const refresh = jar.get(REFRESH_TOKEN_COOKIE)?.value

  if (refresh) {
    const found = await findSessionByRefresh(refresh)
    if (found) {
      await revokeSession(found.sid)

      const h = await headers()
      const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
      const userAgent = h.get('user-agent') || 'unknown'
      const payload = await getPayload({ config: await configPromise })
      await payload.create({
        collection: 'audit-logs',
        data: { action: 'LOGOUT', user: found.userId, ip, userAgent },
      })
    }
  }

  clearSessionCookies(jar)
  return { redirectTo: '/' }
}
