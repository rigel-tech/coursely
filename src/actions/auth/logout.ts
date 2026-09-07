'use server'

import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { STUDENT_TOKEN_COOKIE } from '@/lib/constants/auth'
import { clearStudentCookie } from '@/lib/auth/session-cookies'

/**
 * Sign out of the current device. Resolves the student and the active session id
 * from the `coursely-token` cookie via `payload.auth` — never from `x-user-*`,
 * which a caller could carry from a different tab — drops that one
 * `users_sessions` row, records a `LOGOUT` audit row, clears the cookie, and
 * returns `redirectTo` for the client to navigate (it must not `redirect()` in
 * the same pass — see INVARIANTS). `payload.auth` only reads Payload's own cookie
 * name, so the student token is handed to it through a synthetic header.
 */
export async function logoutAction(): Promise<{ redirectTo: string }> {
  const h = await headers()
  const token = (await cookies()).get(STUDENT_TOKEN_COOKIE)?.value

  try {
    if (token) {
      const payload = await getPayload({ config: await configPromise })
      const { user } = await payload.auth({
        headers: new Headers({ cookie: `payload-token=${token}` }),
      })

      if (user) {
        const sid = (user as { _sid?: string })._sid
        const sessions = ((user as { sessions?: { id: string }[] }).sessions ?? []).filter(
          (s) => s.id !== sid,
        )
        await payload.update({
          collection: 'users',
          id: user.id,
          data: { sessions },
          overrideAccess: true,
        })

        const ip =
          h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
        const userAgent = h.get('user-agent') || 'unknown'
        await payload.create({
          collection: 'audit-logs',
          data: { action: 'LOGOUT', user: user.id, ip, userAgent },
        })
      }
    }
  } catch (err) {
    console.error('logoutAction failed', err)
  }

  clearStudentCookie(await cookies())
  return { redirectTo: '/' }
}
