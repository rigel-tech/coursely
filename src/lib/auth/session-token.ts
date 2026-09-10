/**
 * The two student session tokens. Pure crypto — no datastore, no Payload, no
 * HTTP — so `proxy` imports it directly and a renewal costs no I/O at all.
 *
 * Both are compact HS256 JWTs over the same claims, each signed with its own key
 * derived from `PAYLOAD_SECRET`:
 *
 *   access   sha256("coursely/access-token\0"  + PAYLOAD_SECRET)   — minutes
 *   refresh  sha256("coursely/refresh-token\0" + PAYLOAD_SECRET)   — days
 *
 * Three separations follow, and each matters: an access token cannot be replayed
 * as a refresh token or the other way round, neither can be replayed as Payload's
 * own `payload-token` (Payload signs with the raw secret), and rotating
 * `PAYLOAD_SECRET` signs everybody out at once.
 *
 * There is no session record anywhere: the refresh token *is* the session. A
 * session therefore cannot be revoked before it expires — see INVARIANTS.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { ACCESS_TTL_SEC } from '@/lib/constants/auth'

/** Who a session belongs to. `status` is `students.status` as it was at signing time. */
export type StudentClaims = { id: number; status?: string }

type TokenKind = 'access' | 'refresh'

const keyFor = (kind: TokenKind): Buffer =>
  createHash('sha256')
    .update(`coursely/${kind}-token\0${process.env.PAYLOAD_SECRET ?? ''}`)
    .digest()

const encode = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')

function sign(kind: TokenKind, claims: StudentClaims, ttlSec: number): string {
  const iat = Math.floor(Date.now() / 1000)
  const body: Record<string, unknown> = { sub: claims.id, iat, exp: iat + ttlSec }
  if (claims.status !== undefined) body.status = claims.status

  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode(body)
  const signature = createHmac('sha256', keyFor(kind))
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${signature}`
}

/** `null` for every failure — no cookie, wrong key, tampered, expired, malformed. */
function verify(kind: TokenKind, token: string | undefined): StudentClaims | null {
  if (!token) return null

  const [header, payload, signature] = token.split('.')
  if (!header || !payload || !signature) return null

  const expected = createHmac('sha256', keyFor(kind)).update(`${header}.${payload}`).digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, 'base64url')
  } catch {
    return null
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  let body: Record<string, unknown>
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof body.sub !== 'number') return null
  if (typeof body.exp === 'number' && body.exp * 1000 <= Date.now()) return null

  return { id: body.sub, status: typeof body.status === 'string' ? body.status : undefined }
}

/** Sign the short-lived token `proxy` and the server components read. */
export const signAccessToken = (claims: StudentClaims): string =>
  sign('access', claims, ACCESS_TTL_SEC)

export const verifyAccessToken = (token: string | undefined): StudentClaims | null =>
  verify('access', token)

/** Sign the long-lived token that buys a new access token. `ttlSec` is the session's length. */
export const signRefreshToken = (claims: StudentClaims, ttlSec: number): string =>
  sign('refresh', claims, ttlSec)

export const verifyRefreshToken = (token: string | undefined): StudentClaims | null =>
  verify('refresh', token)
