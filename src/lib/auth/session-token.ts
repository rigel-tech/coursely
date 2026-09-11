/**
 * The two student session tokens. Pure crypto — no datastore, no Payload, no
 * HTTP — so `proxy` imports it directly and a renewal costs no I/O at all.
 *
 * Both are compact HS256 JWTs over the same claims, signed and checked through jose,
 * each under its own key derived from `PAYLOAD_SECRET`:
 *
 *   access   sha256("coursely/access-token\0"  + PAYLOAD_SECRET)   — minutes
 *   refresh  sha256("coursely/refresh-token\0" + PAYLOAD_SECRET)   — days
 *
 * Three separations follow, and each matters: an access token cannot be replayed
 * as a refresh token or the other way round, neither can be replayed as Payload's
 * own `payload-token` (Payload derives its own key from the secret, the first 32
 * characters of `sha256(secret)` in hex), and rotating `PAYLOAD_SECRET` signs
 * everybody out at once.
 *
 * All four entry points are async, and a Promise is truthy — a missing `await`
 * signs everyone out rather than failing. See INVARIANTS before adding a caller.
 *
 * There is no session record anywhere: the refresh token *is* the session. A
 * session therefore cannot be revoked before it expires — see INVARIANTS.
 */
import { createHash } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

import { ACCESS_TTL_SEC } from '@/lib/constants/auth'

/** Who a session belongs to. `status` is `students.status` as it was at signing time. */
export type StudentClaims = { id: number; status?: string }

type TokenKind = 'access' | 'refresh'

const keyFor = (kind: TokenKind): Buffer =>
  createHash('sha256').update(`coursely/${kind}-token\0${process.env.PAYLOAD_SECRET}`).digest()

// `iat` and `exp` are written into the claims object by hand rather than through jose's
// `.setIssuedAt()` / `.setExpirationTime()`, which append: those would emit
// `{sub, status, iat, exp}` and change the bytes of a token shape that is already in
// browsers. The order below is the one the hand-rolled signer produced.
function sign(kind: TokenKind, claims: StudentClaims, ttlSec: number): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const body: Record<string, unknown> = { sub: claims.id, iat, exp: iat + ttlSec }
  if (claims.status !== undefined) body.status = claims.status

  return new SignJWT(body).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(keyFor(kind))
}

/** `null` for every failure — no cookie, wrong key, tampered, expired, malformed. */
async function verify(kind: TokenKind, token: string | undefined): Promise<StudentClaims | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, keyFor(kind), {
      algorithms: ['HS256'],
      requiredClaims: ['exp'],
    })

    // Read `sub` as `unknown`: jose types it as a string because that is what the spec
    // says, but document IDs are numbers here and that is what this module signs.
    const sub: unknown = payload.sub
    if (typeof sub !== 'number') return null

    return { id: sub, status: typeof payload.status === 'string' ? payload.status : undefined }
  } catch {
    return null
  }
}

/** Sign the short-lived token `proxy` and the server components read. */
export const signAccessToken = (claims: StudentClaims): Promise<string> =>
  sign('access', claims, ACCESS_TTL_SEC)

export const verifyAccessToken = (token: string | undefined): Promise<StudentClaims | null> =>
  verify('access', token)

/** Sign the long-lived token that buys a new access token. `ttlSec` is the session's length. */
export const signRefreshToken = (claims: StudentClaims, ttlSec: number): Promise<string> =>
  sign('refresh', claims, ttlSec)

export const verifyRefreshToken = (token: string | undefined): Promise<StudentClaims | null> =>
  verify('refresh', token)
