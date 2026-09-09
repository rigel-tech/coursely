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
const made: { collection: 'users' | 'students'; email: string }[] = []

const uniqueEmail = () => `vt-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

/** Sign a real account in and hand back the token Payload actually issued. */
const tokenFor = async (collection: 'users' | 'students') => {
  const email = uniqueEmail()
  made.push({ collection, email })
  await payload.create({
    collection,
    data: { email, password: 'Secret123', ...(collection === 'students' && { status: 'ACTIVE' }) },
  } as Parameters<Payload['create']>[0])

  const { token } = await payload.login({ collection, data: { email, password: 'Secret123' } })
  return token
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const { collection, email } of made.splice(0)) {
    const { docs } = await payload.find({
      collection,
      where: { email: { equals: email } },
      depth: 0,
    })
    for (const d of docs) await payload.delete({ collection, id: d.id })
  }
})

describe('verifyAuthToken against a real Payload token', () => {
  it('accepts a staff token and decodes the id Payload signed in', async () => {
    const user = verifyAuthToken(await tokenFor('users'), derivedSecret)

    expect(typeof user?.id).toBe('number')
  })

  it('rejects that token under the wrong secret', async () => {
    expect(verifyAuthToken(await tokenFor('users'), 'x'.repeat(32))).toBeNull()
  })

  // The one that matters: a student can authenticate perfectly well — `payload.login` on
  // `students` succeeds and signs a token with the same secret and the same shape. Only the
  // `collection` claim tells them apart, and `/admin` has nothing else left to ask.
  it('rejects a genuine, correctly-signed token issued for students', async () => {
    const token = await tokenFor('students')

    expect(token).toBeTruthy()
    expect(verifyAuthToken(token, derivedSecret)).toBeNull()
  })
})
