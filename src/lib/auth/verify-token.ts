/**
 * Standalone verification of Payload's HS256 session JWT, for use in `proxy`
 * where `getPayload` is not available. Payload signs with
 * `sha256(PAYLOAD_SECRET).hex().slice(0, 32)` as the HMAC key (see
 * `payload/dist/index.js` `this.secret`) and puts `id`, the principal's
 * `collection`, and every `saveToJWT` field in the claims.
 *
 * One secret signs the tokens of every auth collection, so a `students` token
 * verifies here just as cleanly as a staff one — the `collection` claim is the
 * only thing that separates them. Since `decideRoute` no longer has an admin
 * branch, this check is what keeps a student out of `/admin`: anything that is
 * not `users` comes back as `null`, i.e. nobody.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const STAFF_COLLECTION = 'users'

export type AuthUser = { id: number; status?: string; email?: string }

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

export function verifyAuthToken(token: string | undefined, secret: string): AuthUser | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest()
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
  if (typeof claims.id !== 'number') return null
  if (claims.collection !== STAFF_COLLECTION) return null

  return {
    id: claims.id,
    status: str(claims.status),
    email: str(claims.email),
  }
}
