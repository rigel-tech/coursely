/**
 * The two places server code asks "which student is signed in", told apart by whether the
 * caller may write cookies.
 *
 * Both read `coursely-access` out of the `next/headers` request scope, verify it without a
 * datastore hit, then load the document. `depth: 1` because the account page renders
 * `avatar` as a populated `Media`, and `overrideAccess` because `students` is readable by
 * staff only — this is the account acting on itself, not a staff read.
 *
 * `getSessionStudent` only reads. `ensureSessionStudent` also renews from
 * `coursely-refresh`, which it may do only from a Route Handler or a Server Action —
 * `cookies().set()` throws in a Server Component. Picking the wrong one breaks silently
 * either way, so see INVARIANTS before adding a caller.
 *
 * Both return `null` for every failed read, deliberately: no cookie, a forged or expired
 * token, a deleted account, or a database that will not answer all mean the same thing to a
 * caller — there is nobody to render for. A session hiccup must not throw out of a page
 * render.
 *
 * `src/proxy.ts` does NOT use this. Proxy has no `next/headers` request scope and reads the
 * same cookie from `request.cookies`; that is a different surface, and it is the one
 * documented exception to "only one reader"
 * (`tests/unit/repo/session-cookie-readers.spec.ts` counts them).
 */
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/constants/auth'
import { verifyAccessToken, verifyRefreshToken, type StudentClaims } from '@/lib/auth/session-token'
import { clearSessionCookies, refreshAccessCookie } from '@/lib/auth/session-cookies'
import type { Student } from '@/payload-types'

/** Load the document the claims name. `getPayload` sits before the `try` — see the banner. */
async function loadStudent(claims: StudentClaims | null): Promise<Student | null> {
  if (!claims) return null

  const payload = await getPayload({ config: configPromise })

  try {
    return await payload.findByID({
      collection: 'students',
      id: claims.id,
      depth: 1,
      overrideAccess: true,
    })
  } catch (err) {
    // Still `null`, not a rethrow — see the banner. It goes through Payload's logger so it
    // lands wherever the rest of the server's logs do; a swallowed failure with no trace at
    // all is the one kind nobody can chase later.
    payload.logger.error({ err }, 'Failed to resolve the student session')
    return null
  }
}

/**
 * The signed-in student, reading the access cookie and nothing else. For Server Components,
 * which cannot write cookies. An access token that has lapsed reads as signed out here even
 * when a live refresh token sits beside it — that is the renewing reader's job.
 */
export async function getSessionStudent(): Promise<Student | null> {
  const claims = await verifyAccessToken((await cookies()).get(ACCESS_TOKEN_COOKIE)?.value)

  return loadStudent(claims)
}

/**
 * The signed-in student, renewing the access cookie from `coursely-refresh` when it has
 * lapsed. For Route Handlers and Server Actions only.
 *
 * Renewal happens in this scope rather than on the way out, so the same call that mints the
 * cookie also answers with the student — `proxy` writes onto the response while its handler
 * still reads the stale request cookie, and reports signed-out for one round trip. The
 * refresh token is not rotated. A refresh token that does not verify means signed out, and
 * both cookies are cleared.
 */
export async function ensureSessionStudent(): Promise<Student | null> {
  const jar = await cookies()

  const claims = await verifyAccessToken(jar.get(ACCESS_TOKEN_COOKIE)?.value)
  if (claims) return loadStudent(claims)

  const refreshCookie = jar.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshCookie) return null

  const renewed = await verifyRefreshToken(refreshCookie)
  if (!renewed) {
    clearSessionCookies(jar)
    return null
  }

  await refreshAccessCookie(jar, renewed)

  return loadStudent(renewed)
}
