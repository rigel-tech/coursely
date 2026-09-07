/**
 * Resolve the signed-in user from the `payload-token` cookie inside a Server
 * Component or server action — a stateless verify of Payload's session JWT, no
 * Payload call. Kept apart from `verify-token.ts` (which `proxy` imports and must
 * stay free of `next/headers`): this is the request-scoped wrapper for
 * everywhere else.
 */
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'

import { STUDENT_TOKEN_COOKIE } from '@/lib/constants/auth'
import { verifyAuthToken, type AuthUser } from '@/lib/auth/verify-token'

const jwtSecret = createHash('sha256')
  .update(process.env.PAYLOAD_SECRET ?? '')
  .digest('hex')
  .slice(0, 32)

/** Resolve the signed-in student from `coursely-token`. Student surfaces only. */
export async function getSessionUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(STUDENT_TOKEN_COOKIE)?.value
  return verifyAuthToken(token, jwtSecret)
}
