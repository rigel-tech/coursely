import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// File-level: the accounts-access block below needs it too.
beforeAll(async () => {
  const payloadConfig = await config
  payload = await getPayload({ config: payloadConfig })
})

describe('API', () => {
  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })
})

// Completion condition 3 of E-04. Before the split, `users` held students too and
// `read: authenticated` meant any signed-in principal could page the whole account table
// through `GET /api/users` — `proxy` never saw those requests, its matcher excludes `api/`.
// Two things close it now: `read` still demands a principal, and a student is not one —
// students never receive a `payload-token`, so no student request ever arrives with a user
// attached. The first is what this asserts; the second is structural.
describe('the accounts table is not readable without a staff principal', () => {
  it('refuses an anonymous read of users', async () => {
    await expect(payload.find({ collection: 'users', overrideAccess: false })).rejects.toThrow()
  })

  it('refuses an anonymous read of students too', async () => {
    await expect(payload.find({ collection: 'students', overrideAccess: false })).rejects.toThrow()
  })

  it('allows the read once a staff principal is attached', async () => {
    const email = `api-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
    const staff = await payload.create({
      collection: 'users',
      data: { email, password: 'Secret123' },
    })

    try {
      const res = await payload.find({
        collection: 'users',
        overrideAccess: false,
        user: { ...staff, collection: 'users' },
      })
      expect(Array.isArray(res.docs)).toBe(true)
    } finally {
      await payload.delete({ collection: 'users', id: staff.id }).catch(() => {})
    }
  })
})
