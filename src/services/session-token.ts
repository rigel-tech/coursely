/**
 * Session-token primitives (§ access+refresh sessions). Pure crypto — no Redis,
 * no Payload, no HTTP. Safe to import from `proxy`.
 *
 * The access token is a compact HS256 JWT signed with a key **domain-separated**
 * from Payload's own (`sha256("coursely/access-token\0" + PAYLOAD_SECRET)`), so a
 * token minted here can never verify as a `payload-token` or vice versa even
 * though both are HS256. Rotating `PAYLOAD_SECRET` invalidates every access token
 * at once; sessions recover on the next refresh because the refresh token is
 * independent of the secret.
 *
 * The refresh token is 256 bits of CSPRNG output; only `sha256(raw)` is ever
 * persisted (see `session-store`), so a datastore dump yields no usable token.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto'

import { ACCESS_TTL_SEC } from '@/lib/constants/auth'

export type AccessTokenInput = { sub: number; role?: string; status?: string }

/** HS256 key for the access token. Shared with `verifyAccessToken` — never inline a copy. */
export function accessTokenKey(): Buffer {
  return createHash('sha256')
    .update(`coursely/access-token\0${process.env.PAYLOAD_SECRET ?? ''}`)
    .digest()
}

const b64url = (input: Buffer | string): string =>
  (Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8')).toString('base64url')

/** Sign a ~15-minute access token. `role` / `status` are omitted when undefined. */
export function signAccessToken(input: AccessTokenInput): string {
  const iat = Math.floor(Date.now() / 1000)
  const claims: Record<string, unknown> = { sub: input.sub, iat, exp: iat + ACCESS_TTL_SEC }
  if (input.role !== undefined) claims.role = input.role
  if (input.status !== undefined) claims.status = input.status

  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify(claims))
  const sig = createHmac('sha256', accessTokenKey())
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${sig}`
}

/** A fresh opaque refresh token: 32 CSPRNG bytes, base64url, no padding (43 chars). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

/** The only persisted form of a refresh token. */
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
