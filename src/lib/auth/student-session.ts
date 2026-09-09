/**
 * The one place server code asks "which student is signed in".
 *
 * Reads `coursely-access` out of the `next/headers` request scope, verifies it
 * without a datastore hit, then loads the document. `depth: 1` because the
 * account page renders `avatar` as a populated `Media`, and `overrideAccess`
 * because `students` is readable by staff only — this is the account acting on
 * itself, not a staff read.
 *
 * Returns `null` for every failure, deliberately: no cookie, a forged or expired
 * token, a deleted account, or the database being unreachable all mean the same
 * thing to a caller — there is nobody to render for. A session hiccup must not
 * throw out of a page render.
 *
 * `src/proxy.ts` does NOT use this. Proxy has no `next/headers` request scope and
 * reads the same cookie from `request.cookies`; that is a different surface, and
 * it is the one documented exception to "only one reader"
 * (`tests/unit/repo/session-cookie-readers.spec.ts` counts them).
 */
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth'
import { verifyAccessToken } from '@/lib/auth/access-token'
import type { Student } from '@/payload-types'

/** The signed-in student, or `null` if there is no usable session. */
export async function getStudentSession(): Promise<Student | null> {
  const claims = verifyAccessToken((await cookies()).get(ACCESS_TOKEN_COOKIE)?.value)
  if (!claims) return null

  try {
    const payload = await getPayload({ config: configPromise })
    return (await payload.findByID({
      collection: 'students',
      id: claims.id,
      depth: 1,
      overrideAccess: true,
    })) as Student
  } catch (err) {
    console.error('Failed to resolve the student session:', err)
    return null
  }
}
