/**
 * The one place server code asks "which student is signed in".
 *
 * Reads `coursely-access` out of the `next/headers` request scope, verifies it
 * without a datastore hit, then loads the document. `depth: 1` because the
 * account page renders `avatar` as a populated `Media`, and `overrideAccess`
 * because `students` is readable by staff only — this is the account acting on
 * itself, not a staff read.
 *
 * Returns `null` for every failed read, deliberately: no cookie, a forged or expired
 * token, a deleted account, or a database that will not answer all mean the same thing
 * to a caller — there is nobody to render for. A session hiccup must not throw out of a
 * page render. `getPayload` itself is outside that guarantee and sits before the `try`:
 * if Payload cannot start there is no logger to record the failure with, and no page on
 * this site renders anyway.
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
import { verifyAccessToken } from '@/lib/auth/session-token'
import type { Student } from '@/payload-types'

/** The signed-in student, or `null` if there is no usable session. */
export async function getSessionStudent(): Promise<Student | null> {
  const claims = verifyAccessToken((await cookies()).get(ACCESS_TOKEN_COOKIE)?.value)
  if (!claims) return null

  const payload = await getPayload({ config: configPromise })

  try {
    return (await payload.findByID({
      collection: 'students',
      id: claims.id,
      depth: 1,
      overrideAccess: true,
    })) as Student
  } catch (err) {
    // Still `null`, not a rethrow — see the banner. It goes through Payload's logger so
    // it lands wherever the rest of the server's logs do; a swallowed failure with no
    // trace at all is the one kind nobody can chase later.
    payload.logger.error({ err }, 'Failed to resolve the student session')
    return null
  }
}
