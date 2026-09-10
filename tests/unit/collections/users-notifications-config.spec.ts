import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'

import { Users } from '@/collections/Users'
import { Notifications } from '@/collections/Notifications'

const named = (fields: Field[]) =>
  fields.map((f) => ('name' in f ? f.name : undefined)).filter(Boolean) as string[]

const field = (fields: Field[], name: string) => fields.find((f) => 'name' in f && f.name === name)

describe('Users collection config — staff only', () => {
  const names = named(Users.fields)

  it('has no role column: the collection itself says what a principal is', () => {
    expect(names).not.toContain('role')
  })

  it('has shed every student-only field', () => {
    for (const gone of [
      'phone',
      'avatar',
      'status',
      'isWalkIn',
      'verifiedAt',
      'lastLoginAt',
      'createdBy',
    ]) {
      expect(names).not.toContain(gone)
    }
  })

  // Not a leftover. `populateAuthors` copies `fullName` onto `post.populatedAuthors`, which
  // is the only thing the public byline reads — drop it and every byline renders blank with
  // no error anywhere. See INVARIANTS.
  it('keeps fullName, because the post byline is built from it', () => {
    expect(names).toContain('fullName')
  })

  it('titles rows by email and no longer lists role or status as columns', () => {
    expect(Users.admin?.useAsTitle).toBe('email')
    expect(Users.admin?.defaultColumns).not.toContain('role')
    expect(Users.admin?.defaultColumns).not.toContain('status')
  })
})

describe('Notifications collection config', () => {
  const names = named(Notifications.fields)

  it('is registered under the "notifications" slug', () => {
    expect(Notifications.slug).toBe('notifications')
  })

  it('carries the fields from spec step 6b', () => {
    expect(names).toEqual(
      expect.arrayContaining(['student', 'type', 'title', 'content', 'metadata', 'isRead']),
    )
  })

  it('belongs to a student — notifications are addressed to the public site, not to staff', () => {
    const student = field(Notifications.fields, 'student') as Extract<
      Field,
      { type: 'relationship' }
    >

    expect(student.relationTo).toBe('students')
    expect(names).not.toContain('user')
  })

  it('requires student, title and content', () => {
    for (const name of ['student', 'title', 'content']) {
      const f = field(Notifications.fields, name) as Extract<Field, { required?: boolean }>
      expect(f.required).toBe(true)
    }
  })

  it('defaults isRead to false', () => {
    const isRead = field(Notifications.fields, 'isRead') as Extract<Field, { type: 'checkbox' }>
    expect(isRead.defaultValue).toBe(false)
  })
})
