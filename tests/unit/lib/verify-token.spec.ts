import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'

import { verifyAuthToken } from '@/lib/auth/verify-token'

const SECRET = 'a'.repeat(32)

/** Sign a JWT exactly the way Payload does (HS256, raw secret as the HMAC key). */
const sign = (claims: Record<string, unknown>, secret = SECRET) => {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const p = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')
  return `${h}.${p}.${sig}`
}

const future = Math.floor(Date.now() / 1000) + 3600
const past = Math.floor(Date.now() / 1000) - 10

/** A staff token: what Payload signs when the principal comes from `users`. */
const staff = (over: Record<string, unknown> = {}) =>
  sign({ id: 7, email: 'a@b.com', collection: 'users', status: 'ACTIVE', exp: future, ...over })

describe('verifyAuthToken', () => {
  it('returns the identity claims for a valid, unexpired staff token', () => {
    expect(verifyAuthToken(staff(), SECRET)).toEqual({
      id: 7,
      email: 'a@b.com',
      status: 'ACTIVE',
    })
  })

  it('rejects an expired token', () => {
    expect(verifyAuthToken(staff({ exp: past }), SECRET)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const [h, , sig] = staff().split('.')
    const forged = Buffer.from(
      JSON.stringify({ id: 7, collection: 'users', exp: future }),
    ).toString('base64url')
    expect(verifyAuthToken(`${h}.${forged}.${sig}`, SECRET)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const other = sign({ id: 7, collection: 'users', exp: future }, 'b'.repeat(32))
    expect(verifyAuthToken(other, SECRET)).toBeNull()
  })

  it('rejects missing, malformed, or id-less tokens', () => {
    expect(verifyAuthToken(undefined, SECRET)).toBeNull()
    expect(verifyAuthToken('not.a.jwt', SECRET)).toBeNull()
    expect(verifyAuthToken('only-one-part', SECRET)).toBeNull()
    expect(
      verifyAuthToken(sign({ email: 'a@b.com', collection: 'users', exp: future }), SECRET),
    ).toBeNull()
  })
})

// Once `decideRoute` loses its admin branch, this function alone decides who counts as a
// staff principal at `/admin`. A token from any other auth collection must come back as
// "nobody" — not as a user whose id happens to collide with a staff id.
describe('verifyAuthToken — only the users collection is a staff principal', () => {
  it('rejects a structurally valid token issued for students', () => {
    expect(verifyAuthToken(staff({ collection: 'students' }), SECRET)).toBeNull()
  })

  it('rejects a token carrying no collection claim at all', () => {
    expect(verifyAuthToken(sign({ id: 7, status: 'ACTIVE', exp: future }), SECRET)).toBeNull()
  })

  it('rejects a non-string collection claim', () => {
    expect(verifyAuthToken(staff({ collection: 1 }), SECRET)).toBeNull()
  })
})
