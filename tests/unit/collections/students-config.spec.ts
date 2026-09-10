import { describe, it, expect } from 'vitest'
import type { Access, Field, PayloadRequest } from 'payload'

import { Students } from '@/collections/Students'
import { Users } from '@/collections/Users'
import { authenticated } from '@/access/authenticated'
import configPromise from '@/payload.config'

const named = (fields: Field[]) =>
  fields.map((f) => ('name' in f ? f.name : undefined)).filter(Boolean) as string[]

const field = (fields: Field[], name: string) => fields.find((f) => 'name' in f && f.name === name)

/** Calls an access function as a signed-in staff member — the case that must still be denied. */
const asStaff = (fn: Access | undefined) =>
  fn?.({ req: { user: { id: 1, collection: 'users' } } as unknown as PayloadRequest })

describe('Students collection access', () => {
  it('denies the admin panel to every principal, signed in or not', () => {
    expect(asStaff(Students.access?.admin)).toBe(false)
  })

  it('denies create outright — students arrive through the registration flow', () => {
    expect(asStaff(Students.access?.create)).toBe(false)
  })

  it('leaves read, update and delete to staff', () => {
    expect(Students.access?.read).toBe(authenticated)
    expect(Students.access?.update).toBe(authenticated)
    expect(Students.access?.delete).toBe(authenticated)
  })
})

describe('Students auth configuration', () => {
  it('configures auth as an object so useSessions can be turned off', () => {
    expect(typeof Students.auth).toBe('object')
  })

  it('turns off Payload sessions — the coursely cookie pair is the session mechanism', () => {
    expect(Students.auth).toMatchObject({ useSessions: false })
  })

  it('keeps the local strategy on — login, lockout and password reset all depend on it', () => {
    expect(Students.auth).not.toHaveProperty('disableLocalStrategy')
  })
})

describe('Students fields', () => {
  const names = named(Students.fields)

  it('carries the eight profile and lifecycle fields moved off users', () => {
    expect(names).toEqual(
      expect.arrayContaining([
        'fullName',
        'phone',
        'avatar',
        'status',
        'verifiedAt',
        'lastLoginAt',
        'isWalkIn',
        'createdBy',
      ]),
    )
  })

  it('has no role field — the collection itself answers what this principal is', () => {
    expect(names).not.toContain('role')
  })

  it('keeps status on the JWT with the same enum and default as before', () => {
    const status = field(Students.fields, 'status') as Extract<Field, { type: 'select' }>

    expect(status.saveToJWT).toBe(true)
    expect(status.options).toEqual(['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'])
    expect(status.defaultValue).toBe('PENDING_VERIFICATION')
  })

  it('points createdBy at users — the one place the two lanes meet', () => {
    const createdBy = field(Students.fields, 'createdBy') as Extract<
      Field,
      { type: 'relationship' }
    >

    expect(createdBy.relationTo).toBe('users')
  })
})

describe('Students registration in the Payload config', () => {
  it('is registered as a collection', async () => {
    const config = await configPromise

    expect(config.collections.map((c) => c.slug)).toContain('students')
  })

  it('does not take over admin.user — the admin panel principal stays users', async () => {
    const config = await configPromise

    expect(config.admin.user).toBe(Users.slug)
  })
})
