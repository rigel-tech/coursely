/**
 * `GET /next/auth-status` → `{ authenticated: boolean, user?: { id: number, name: string, email?: string } }`.
 *
 * Exists so the public header can learn whether the browser has an active session
 * and retrieve the current user's profile info (fullName, email) without a Server
 * Component reading `headers()` / `cookies()`: the header's host pages are
 * `force-static`, which blanks those APIs.
 */
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getSessionUser } from '@/lib/auth/session-user'
import type { User } from '@/payload-types'

export async function GET(): Promise<Response> {
  const claims = await getSessionUser()

  if (!claims) {
    return Response.json({ authenticated: false })
  }

  try {
    const payload = await getPayload({ config: configPromise })
    const user = (await payload.findByID({
      collection: 'users',
      id: claims.id,
      depth: 0,
      overrideAccess: true,
    })) as User

    const displayName =
      user?.fullName?.trim() || (user?.email ? user.email.split('@')[0] : 'Tài khoản')

    return Response.json({
      authenticated: true,
      user: {
        id: claims.id,
        name: displayName,
        email: user?.email,
      },
    })
  } catch (err) {
    console.error('Failed to resolve auth-status user:', err)
    return Response.json({
      authenticated: true,
      user: {
        id: claims.id,
        name: 'Tài khoản',
      },
    })
  }
}
