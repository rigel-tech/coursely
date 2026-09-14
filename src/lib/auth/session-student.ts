import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth'
import { verifyAccessToken } from '@/lib/auth/session-token'
import type { Student } from '@/payload-types'

/** The signed-in student, or `null` if there is no usable session. */
export async function getSessionStudent(): Promise<Student | null> {
  const claims = await verifyAccessToken((await cookies()).get(ACCESS_TOKEN_COOKIE)?.value)
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
    payload.logger.error({ err }, 'Failed to resolve the student session')
    return null
  }
}
