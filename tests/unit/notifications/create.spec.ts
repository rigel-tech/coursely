import { describe, expect, it, vi } from 'vitest'

import { createNotification } from '@/notifications/create'
import type { Payload } from 'payload'

describe('createNotification', () => {
  it('includes the student when studentId is given', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = { create } as unknown as Payload

    await createNotification(payload, {
      studentId: 7,
      type: 'ENROLLMENT_CREATED',
      title: 'Đăng ký khóa học thành công',
      content: 'Nội dung',
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'notifications',
        data: expect.objectContaining({ student: 7 }),
      }),
    )
  })

  it('omits the student key entirely when studentId is not given', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = { create } as unknown as Payload

    await createNotification(payload, {
      type: 'ACCOUNT_CREATED',
      title: 'Có người dùng đăng ký tài khoản mới',
      content: 'Nội dung',
    })

    const { data } = create.mock.calls[0][0]
    expect(data).not.toHaveProperty('student')
  })
})
