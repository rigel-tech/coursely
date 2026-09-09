import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

/**
 * Grants access to a signed-in **staff** principal — a document from the `users`
 * collection — and no one else.
 *
 * The `collection` check is load-bearing, not defensive. Every Payload auth
 * collection issues a `payload-token`, so a student can obtain one from
 * `POST /api/students/login`, and `proxy` does not cover `/api/`. A predicate that
 * only asked `Boolean(user)` therefore let a student read and write every
 * collection this guards — `users`, `students`, `media`, `posts`, … — straight
 * over the REST API. The admin-panel gate (`Students.access.admin: () => false`)
 * does not help there; it only covers the UI. See INVARIANTS.
 *
 * The `AccessArgs<User>` type says the principal is a `User`, but at runtime it is
 * whatever collection signed the token, so the shape cannot be trusted — only the
 * `collection` field can.
 */
type isAuthenticated = (args: AccessArgs<User>) => boolean

export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return user?.collection === 'users'
}
