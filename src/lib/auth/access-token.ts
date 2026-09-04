/**
 * Standalone verification of the custom student access token, for use in `proxy`
 * where `getPayload` is unavailable. Mirrors `src/lib/auth/verify-token.ts` (which
 * stays the verifier for Payload's admin `payload-token`) but keys off the
 * domain-separated access-token key — see `src/services/session-token.ts`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

import { accessTokenKey } from '@/services/session-token'

export type AccessClaims = { id: number; role?: string; status?: string }

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

export function verifyAccessToken(token: string | undefined): AccessClaims | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts

  const expected = createHmac('sha256', accessTokenKey()).update(`${header}.${payload}`).digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, 'base64url')
  } catch {
    return null
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  let claims: Record<string, unknown>
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return null
  if (typeof claims.sub !== 'number') return null

  return { id: claims.sub, role: str(claims.role), status: str(claims.status) }
}
