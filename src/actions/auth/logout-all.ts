'use server'

import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { STUDENT_TOKEN_COOKIE } from '@/lib/constants/auth'
import { clearStudentCookie } from '@/lib/auth/session-cookies'

/**
 * Sign out of every device. Like `logoutAction` but resolves the account from the
 * `coursely-token` cookie via `payload.auth` and empties its `users_sessions`
 * rows — the invoking one included — then records a `LOGOUT_ALL` audit row.
 * Returns `redirectTo`; never `redirect()` (see INVARIANTS).
 */
export async function logoutAllAction(): Promise<{ redirectTo: string }> {
  const h = await headers()
  const token = (await cookies()).get(STUDENT_TOKEN_COOKIE)?.value

  try {
    if (token) {
      const payload = await getPayload({ config: await configPromise })
      const { user } = await payload.auth({
        headers: new Headers({ cookie: `payload-token=${token}` }),
      })

      if (user) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: { sessions: [] },
          overrideAccess: true,
        })

        const ip =
          h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
        const userAgent = h.get('user-agent') || 'unknown'
        await payload.create({
          collection: 'audit-logs',
          data: { action: 'LOGOUT_ALL', user: user.id, ip, userAgent },
        })
      }
    }
  } catch (err) {
    console.error('logoutAllAction failed', err)
  }

  clearStudentCookie(await cookies())
  return { redirectTo: '/' }
}
