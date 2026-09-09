import { describe, it, expect } from 'vitest'
import type { AccessArgs } from 'payload'

import { authenticated } from '@/access/authenticated'
import type { User } from '@/payload-types'

/** Call `authenticated` with a principal from a given collection (or none). */
const withUser = (collection?: 'users' | 'students') =>
  authenticated({
    req: { user: collection ? { id: 1, collection } : null },
  } as unknown as AccessArgs<User>)

// `authenticated` gates the admin content collections (Users, Media, Posts, …). Every one
// of Payload's auth collections signs a `payload-token`, so a student can obtain one from
// POST /api/students/login and reach the REST API — which `proxy` does not cover. The only
// thing that can tell a staff request from a student request at the access layer is the
// principal's `collection`, so this predicate must check it, not merely that someone is
// signed in.
describe('authenticated — staff principals only', () => {
  it('allows a users principal', () => {
    expect(withUser('users')).toBe(true)
  })

  it('denies a students principal, even though it is signed in', () => {
    expect(withUser('students')).toBe(false)
  })

  it('denies an anonymous request', () => {
    expect(withUser()).toBe(false)
  })
})
