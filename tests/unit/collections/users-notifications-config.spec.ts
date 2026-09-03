import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'

import { Users } from '@/collections/Users'
import { Notifications } from '@/collections/Notifications'

const named = (fields: Field[]) =>
  fields.map((f) => ('name' in f ? f.name : undefined)).filter(Boolean) as string[]

const field = (fields: Field[], name: string) => fields.find((f) => 'name' in f && f.name === name)

describe('Users collection config', () => {
  const names = named(Users.fields)

  it('replaces the bare "name" field with the DBML profile + status fields', () => {
    expect(names).not.toContain('name')
    expect(names).toEqual(
      expect.arrayContaining([
        'fullName',
        'phone',
        'avatar',
        'role',
        'status',
        'isWalkIn',
        'verifiedAt',
        'lastLoginAt',
        'createdBy',
      ]),
    )
  })

  it('constrains role and status to the DBML enums with the right defaults', () => {
    const role = field(Users.fields, 'role') as Extract<Field, { type: 'select' }>
    const status = field(Users.fields, 'status') as Extract<Field, { type: 'select' }>

    expect(role.options).toEqual(['ADMIN', 'STUDENT'])
    expect(role.defaultValue).toBe('STUDENT')
    expect(status.options).toEqual(['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'])
    expect(status.defaultValue).toBe('PENDING_VERIFICATION')
  })

  it('titles rows by email', () => {
    expect(Users.admin?.useAsTitle).toBe('email')
  })
})

describe('Notifications collection config', () => {
  const names = named(Notifications.fields)

  it('is registered under the "notifications" slug', () => {
    expect(Notifications.slug).toBe('notifications')
  })

  it('carries the fields from spec step 6b', () => {
    expect(names).toEqual(
      expect.arrayContaining(['user', 'type', 'title', 'content', 'metadata', 'isRead']),
    )
  })

  it('requires user, title and content', () => {
    for (const name of ['user', 'title', 'content']) {
      const f = field(Notifications.fields, name) as Extract<Field, { required?: boolean }>
      expect(f.required).toBe(true)
    }
  })

  it('defaults isRead to false', () => {
    const isRead = field(Notifications.fields, 'isRead') as Extract<Field, { type: 'checkbox' }>
    expect(isRead.defaultValue).toBe(false)
  })
})
