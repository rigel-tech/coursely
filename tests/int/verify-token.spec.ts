// @vitest-environment node
// Exercises jose's JWT signing via payload.login, which needs the Node realm.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { verifyAuthToken } from '@/lib/auth/verify-token'

const derivedSecret = createHash('sha256')
  .update(process.env.PAYLOAD_SECRET as string)
  .digest('hex')
  .slice(0, 32)

let payload: Payload
const emails: string[] = []

const seed = async (over: { role?: 'ADMIN' | 'STUDENT'; status?: string } = {}) => {
  const email = `vt-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  emails.push(email)
  await payload.create({
    collection: 'users',
    data: {
      email,
      password: 'Secret123',
      role: over.role ?? 'STUDENT',
      status: (over.status ?? 'ACTIVE') as 'ACTIVE',
    },
  })
  const role = over.role ?? 'STUDENT'
  const { token } = await payload.login({
    collection: 'users',
    data: { email, password: 'Secret123' },
    // `enforceLoginBoundary`: the student form passes this, the admin panel does not
    context: role === 'STUDENT' ? { source: 'student' } : undefined,
  })
  return token
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const email of emails.splice(0)) {
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      depth: 0,
    })
    for (const u of docs) await payload.delete({ collection: 'users', id: u.id })
  }
})

describe('verifyAuthToken against a real Payload token', () => {
  it('decodes the id, role and status Payload signed in', async () => {
    const token = await seed({ role: 'ADMIN', status: 'ACTIVE' })

    const user = verifyAuthToken(token, derivedSecret)
    expect(user).toMatchObject({ role: 'ADMIN', status: 'ACTIVE' })
    expect(typeof user?.id).toBe('number')
  })

  it('rejects that token under the wrong secret', async () => {
    const token = await seed()
    expect(verifyAuthToken(token, 'x'.repeat(32))).toBeNull()
  })

  it('decodes a STUDENT token too — the same verifier now gates every route', async () => {
    const token = await seed({ role: 'STUDENT', status: 'ACTIVE' })
    const user = verifyAuthToken(token, derivedSecret)
    expect(user).toMatchObject({ role: 'STUDENT', status: 'ACTIVE' })
    expect(typeof user?.id).toBe('number')
  })

  it('rejects a missing token', () => {
    expect(verifyAuthToken(undefined, derivedSecret)).toBeNull()
  })
})
