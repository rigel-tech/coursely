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

describe('verifyAuthToken', () => {
  it('returns the identity claims for a valid, unexpired token', () => {
    const token = sign({ id: 7, email: 'a@b.com', role: 'STUDENT', status: 'ACTIVE', exp: future })
    expect(verifyAuthToken(token, SECRET)).toEqual({
      id: 7,
      email: 'a@b.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    })
  })

  it('rejects an expired token', () => {
    expect(verifyAuthToken(sign({ id: 7, exp: past }), SECRET)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const [h, , sig] = sign({ id: 7, role: 'STUDENT', exp: future }).split('.')
    const forged = Buffer.from(JSON.stringify({ id: 7, role: 'ADMIN', exp: future })).toString(
      'base64url',
    )
    expect(verifyAuthToken(`${h}.${forged}.${sig}`, SECRET)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    expect(verifyAuthToken(sign({ id: 7, exp: future }, 'b'.repeat(32)), SECRET)).toBeNull()
  })

  it('rejects missing, malformed, or id-less tokens', () => {
    expect(verifyAuthToken(undefined, SECRET)).toBeNull()
    expect(verifyAuthToken('not.a.jwt', SECRET)).toBeNull()
    expect(verifyAuthToken('only-one-part', SECRET)).toBeNull()
    expect(verifyAuthToken(sign({ email: 'a@b.com', exp: future }), SECRET)).toBeNull()
  })
})
