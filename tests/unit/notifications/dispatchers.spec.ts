import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { notifyClassAssigned } from '@/notifications/class-assigned'
import { notifyPaymentRecorded } from '@/notifications/payment-recorded'
import { notifyClassScheduleOrStatusChange } from '@/notifications/class-lifecycle'
import * as emailSend from '@/email/send'

vi.mock('@/email/send', () => ({
  sendClassAssignedEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentRecordedEmail: vi.fn().mockResolvedValue(undefined),
  sendClassCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendClassRescheduledEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('notifyClassAssigned', () => {
  it('creates in-app notification and dispatches class assigned email', () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = {
      create,
      logger: { error: vi.fn() },
    } as unknown as Payload

    notifyClassAssigned({
      payload,
      student: { id: 10, email: 'student@test.com', fullName: 'Học viên A' },
      course: { id: 101, title: 'React Pro' },
      classDoc: {
        id: 5,
        code: 'REACT-01',
        startDate: '2026-10-01',
        endDate: '2026-12-01',
        scheduleTime: 'Tối 2-4-6',
        location: 'Phòng 101',
      },
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'notifications',
        data: expect.objectContaining({
          student: 10,
          type: 'CLASS_ASSIGNED',
          metadata: { course: 101, class: 5 },
        }),
      }),
    )

    expect(emailSend.sendClassAssignedEmail).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({
        to: 'student@test.com',
        studentNameOrEmail: 'Học viên A',
        courseTitle: 'React Pro',
        classCode: 'REACT-01',
      }),
    )
  })
})

describe('notifyPaymentRecorded', () => {
  it('creates in-app notification and dispatches payment recorded email', () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = {
      create,
      logger: { error: vi.fn() },
    } as unknown as Payload

    notifyPaymentRecorded({
      payload,
      student: { id: 12, email: 'student2@test.com', fullName: 'Học viên B' },
      course: { id: 102, title: 'Node.js' },
      payment: {
        id: 88,
        amount: 3000000,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2026-09-19',
        referenceNote: 'REF88',
      },
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'notifications',
        data: expect.objectContaining({
          student: 12,
          type: 'PAYMENT_RECORDED',
          metadata: { course: 102, payment: 88 },
        }),
      }),
    )

    expect(emailSend.sendPaymentRecordedEmail).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({
        to: 'student2@test.com',
        amount: 3000000,
        paymentMethod: 'BANK_TRANSFER',
      }),
    )
  })
})

describe('notifyClassScheduleOrStatusChange', () => {
  it('notifies all enrolled students when class is cancelled', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = {
      create,
      find: vi.fn().mockResolvedValue({
        docs: [
          { student: { id: 1, email: 's1@test.com', fullName: 'HS 1' } },
          { student: { id: 2, email: 's2@test.com', fullName: 'HS 2' } },
        ],
      }),
      logger: { error: vi.fn() },
    } as unknown as Payload

    await notifyClassScheduleOrStatusChange({
      payload,
      classDoc: { id: 7, code: 'PY-01' } as never,
      course: { id: 200, title: 'Python' } as never,
      isCancelled: true,
    })

    expect(create).toHaveBeenCalledTimes(2)
    expect(emailSend.sendClassCancelledEmail).toHaveBeenCalledTimes(2)
  })

  it('notifies all enrolled students when class is rescheduled', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const payload = {
      create,
      find: vi.fn().mockResolvedValue({
        docs: [{ student: { id: 3, email: 's3@test.com', fullName: 'HS 3' } }],
      }),
      logger: { error: vi.fn() },
    } as unknown as Payload

    await notifyClassScheduleOrStatusChange({
      payload,
      classDoc: {
        id: 8,
        code: 'JAVA-01',
        startDate: '2026-11-01',
        scheduleTime: 'Tối 3-5-7',
        location: 'Phòng 202',
      } as never,
      course: { id: 300, title: 'Java' } as never,
      isCancelled: false,
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          student: 3,
          type: 'CLASS_RESCHEDULED',
        }),
      }),
    )
    expect(emailSend.sendClassRescheduledEmail).toHaveBeenCalledTimes(1)
  })
})
