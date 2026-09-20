import { describe, expect, it, vi } from 'vitest'

import { createStaffNotification, createStudentNotification } from '@/notifications/create'
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

describe('createStaffNotification', () => {
  it('writes general notification for staff without specifying student or user', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = { create } as unknown as Payload

    await createStaffNotification(payload, {
      type: 'ENROLLMENT_CREATED',
      title: 'Có đơn đăng ký khóa học mới',
      content: 'Nội dung thông báo cho staff',
    })

    const { data } = create.mock.calls[0][0]
    expect(data).toMatchObject({
      type: 'ENROLLMENT_CREATED',
      title: 'Có đơn đăng ký khóa học mới',
      content: 'Nội dung thông báo cho staff',
    })
    expect(data).not.toHaveProperty('student')
    expect(data).not.toHaveProperty('user')
  })
})
