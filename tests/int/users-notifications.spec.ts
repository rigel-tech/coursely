import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

describe('users collection defaults', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('applies STUDENT / PENDING_VERIFICATION / isWalkIn=false when unspecified', async () => {
    // Omitting role/status on purpose — this asserts the collection defaults fill them.
    // @ts-expect-error role/status are `required` in the input type but carry defaultValues.
    const user = await payload.create({
      collection: 'users',
      data: { email: uniqueEmail(), password: 'Passw0rd123' },
    })

    expect(user.role).toBe('STUDENT')
    expect(user.status).toBe('PENDING_VERIFICATION')
    expect(user.isWalkIn).toBe(false)

    await payload.delete({ collection: 'users', id: user.id })
  })
})

describe('notifications collection', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('rejects a notification with no user/title/content', async () => {
    await expect(
      payload.create({ collection: 'notifications', data: {} as never }),
    ).rejects.toThrow()
  })

  it('stores a notification and defaults isRead to false', async () => {
    const owner = await payload.create({
      collection: 'users',
      data: { email: uniqueEmail(), password: 'Passw0rd123', role: 'STUDENT', status: 'ACTIVE' },
    })

    const notification = await payload.create({
      collection: 'notifications',
      data: {
        user: owner.id,
        type: 'ACCOUNT_CREATED',
        title: 'Chào mừng bạn đến với Coursely',
        content: 'Tài khoản của bạn đã được tạo. Hãy xác minh email để bắt đầu.',
      },
    })

    expect(notification.isRead).toBe(false)

    await payload.delete({ collection: 'notifications', id: notification.id })
    await payload.delete({ collection: 'users', id: owner.id })
  })
})
