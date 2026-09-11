import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

// These defaults moved to `students` with the fields themselves. `users` keeps no
// lifecycle field at all now — staff have an email, a password and a name.
describe('students collection defaults', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('applies ACTIVE / isWalkIn=false when unspecified', async () => {
    // Omitting status on purpose — this asserts the collection defaults fill it.
    // The default serves the account staff create at the counter: usable at once. Self
    // registration never reaches it — `registerStudent` passes PENDING_VERIFICATION itself.
    // @ts-expect-error status is `required` in the input type but carries a defaultValue.
    const student = await payload.create({
      collection: 'students',
      data: { email: uniqueEmail(), password: 'Passw0rd123' },
    })

    expect(student.status).toBe('ACTIVE')
    expect(student.isWalkIn).toBe(false)

    await payload.delete({ collection: 'students', id: student.id })
  })
})

describe('notifications collection', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('rejects a notification with no student/title/content', async () => {
    await expect(
      payload.create({ collection: 'notifications', data: {} as never }),
    ).rejects.toThrow()
  })

  it('stores a notification and defaults isRead to false', async () => {
    const owner = await payload.create({
      collection: 'students',
      data: { email: uniqueEmail(), password: 'Passw0rd123', status: 'ACTIVE' },
    })

    const notification = await payload.create({
      collection: 'notifications',
      data: {
        student: owner.id,
        type: 'ACCOUNT_CREATED',
        title: 'Chào mừng bạn đến với Coursely',
        content: 'Tài khoản của bạn đã được tạo. Hãy xác minh email để bắt đầu.',
      },
    })

    expect(notification.isRead).toBe(false)

    await payload.delete({ collection: 'notifications', id: notification.id })
    await payload.delete({ collection: 'students', id: owner.id })
  })
})
