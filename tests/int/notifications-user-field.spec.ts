// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

/**
 * `notifications.user` mirrors `notifications.student` (INVARIANTS.md): a real FK to
 * `users`, enforced at the database level, not just accepted and silently dropped by
 * Payload's relationship field.
 */
let payload: Payload
const madeUserIds = new Set<number>()
const madeNotificationIds = new Set<number>()

const uniqueEmail = () =>
  `notifications-user-field-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const id of madeNotificationIds) {
    await payload.delete({ collection: 'notifications', id }).catch(() => {})
  }
  madeNotificationIds.clear()
  for (const id of madeUserIds) {
    await payload.delete({ collection: 'users', id }).catch(() => {})
  }
  madeUserIds.clear()
})

describe('notifications.user field', () => {
  it('stores and reads back a staff user reference', async () => {
    const staff = await payload.create({
      collection: 'users',
      data: { email: uniqueEmail(), password: 'Secret123' },
    })
    madeUserIds.add(staff.id)

    const created = await payload.create({
      collection: 'notifications',
      data: {
        user: staff.id,
        type: 'ACCOUNT_CREATED',
        title: 'Test',
        content: 'Test',
      },
      overrideAccess: true,
    })
    madeNotificationIds.add(created.id)

    const found = await payload.findByID({
      collection: 'notifications',
      id: created.id,
      depth: 0,
      overrideAccess: true,
    })

    expect(found.user).toBe(staff.id)
  })

  it('rejects a user id that does not exist', async () => {
    await expect(
      payload.create({
        collection: 'notifications',
        data: {
          user: 999_999_999,
          type: 'ACCOUNT_CREATED',
          title: 'Test',
          content: 'Test',
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
