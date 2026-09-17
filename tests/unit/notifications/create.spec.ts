import { describe, expect, it, vi } from 'vitest'

import { createStudentNotification, createUserNotification } from '@/notifications/create'
import type { Payload } from 'payload'

describe('createStudentNotification', () => {
  it('writes the student and omits user', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = { create } as unknown as Payload

    await createStudentNotification(payload, {
      studentId: 7,
      type: 'ENROLLMENT_CREATED',
      title: 'Đăng ký khóa học thành công',
      content: 'Nội dung',
    })

    const { data } = create.mock.calls[0][0]
    expect(data).toMatchObject({ student: 7 })
    expect(data).not.toHaveProperty('user')
  })
})

describe('createUserNotification', () => {
  it('writes the user and omits student', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = { create } as unknown as Payload

    await createUserNotification(payload, {
      userId: 9,
      type: 'ACCOUNT_CREATED',
      title: 'Có người dùng đăng ký tài khoản mới',
      content: 'Nội dung',
    })

    const { data } = create.mock.calls[0][0]
    expect(data).toMatchObject({ user: 9 })
    expect(data).not.toHaveProperty('student')
  })
})
