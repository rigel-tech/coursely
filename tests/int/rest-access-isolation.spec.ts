// @vitest-environment node
// A signed-in student must not reach the staff REST API. Payload issues a `payload-token`
// from POST /api/students/login for any registered student, and `proxy` does not cover
// `/api/`, so `users`' access control is the only thing standing between that token and the
// whole accounts table. This is completion condition #3 of E-04.
//
// The exploit these reverse: student token → GET /api/users (dump staff) → POST /api/users
// (mint staff) → PATCH /api/users/:id (take over admin). Passing a `{ ...doc, collection }`
// principal to the Local API with `overrideAccess: false` runs the exact access path the
// REST endpoint runs, with `req.user.collection` set the same way the token sets it.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
let studentPrincipal: Record<string, unknown>
let staffPrincipal: Record<string, unknown>
let adminId: number
const madeStudents: number[] = []
const madeStaff: number[] = []

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail('rest-student'), password: 'Secret123', status: 'ACTIVE' },
  })
  madeStudents.push(student.id as number)
  studentPrincipal = { ...student, collection: 'students' }

  const staff = await payload.create({
    collection: 'users',
    data: { email: uniqueEmail('rest-staff'), password: 'Secret123' },
  })
  adminId = staff.id as number
  madeStaff.push(adminId)
  staffPrincipal = { ...staff, collection: 'users' }
})

afterAll(async () => {
  for (const id of madeStaff) await payload.delete({ collection: 'users', id }).catch(() => {})
  for (const id of madeStudents)
    await payload.delete({ collection: 'students', id }).catch(() => {})
})

describe('a student principal is locked out of the staff API', () => {
  it('cannot read the accounts table', async () => {
    await expect(
      payload.find({ collection: 'users', overrideAccess: false, user: studentPrincipal }),
    ).rejects.toThrow()
  })

  it('cannot create a staff account', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: { email: uniqueEmail('injected'), password: 'Pwned123' },
        overrideAccess: false,
        user: studentPrincipal,
      }),
    ).rejects.toThrow()
  })

  it('cannot take over an admin by resetting its password', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: adminId,
        data: { password: 'Hijacked123' },
        overrideAccess: false,
        user: studentPrincipal,
      }),
    ).rejects.toThrow()
  })
})

describe('a staff principal keeps its access', () => {
  it('reads the accounts table', async () => {
    const res = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: staffPrincipal,
    })
    expect(Array.isArray(res.docs)).toBe(true)
  })

  it('creates a staff account', async () => {
    const created = await payload.create({
      collection: 'users',
      data: { email: uniqueEmail('rest-made'), password: 'Secret123' },
      overrideAccess: false,
      user: staffPrincipal,
    })
    madeStaff.push(created.id as number)
    expect(created.id).toBeTruthy()
  })
})
