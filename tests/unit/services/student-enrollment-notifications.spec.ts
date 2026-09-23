import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import * as emailSend from '@/email/send'
import { cancelStudentEnrollment, createStudentEnrollment } from '@/services/student-enrollment'
import { asPayload } from '../helpers/payload-stub'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))
vi.mock('@/email/send', () => ({
  sendEnrollmentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendEnrollmentCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendEnrollmentConfirmedEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminEnrollmentCreatedEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminEnrollmentCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendClassAssignedEmail: vi.fn().mockResolvedValue(undefined),
  sendClassCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendClassRescheduledEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentRecordedEmail: vi.fn().mockResolvedValue(undefined),
}))

const course = {
  id: 12,
  title: 'Frontend cơ bản',
  registrationStartAt: null,
  registrationEndAt: null,
}
const student = { id: 7, email: 'student@example.com', fullName: 'Nguyễn Văn A' }

// A "sends nothing" assertion has to catch fire-and-forget work too; every stub resolves as
// a microtask, so one macrotask turn drains all of it.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function expectNoEmail() {
  for (const send of Object.values(emailSend)) expect(send).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
})

// Enrollment notifications are raised by `Enrollments`' `notifyOnStatusChange` hook for
// every path that writes one; a service that also notified would send each one twice.
describe('the student-facing enrollment services raise no notifications of their own', () => {
  it('createStudentEnrollment writes the enrollment and nothing else', async () => {
    const create = vi.fn().mockResolvedValue({ id: 31 })
    vi.mocked(getPayload).mockResolvedValue(
      asPayload({
        create,
        find: vi.fn(({ collection }: { collection: string }) =>
          Promise.resolve({ docs: collection === 'courses' ? [course] : [] }),
        ),
        logger: { error: vi.fn() },
      }),
    )

    await expect(createStudentEnrollment({ courseId: 12, student })).resolves.toBe(31)
    await settle()

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'enrollments' }))
    expectNoEmail()
  })

  it('cancelStudentEnrollment writes the cancellation and nothing else', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 })
    const update = vi.fn().mockResolvedValue({ id: 41 })
    vi.mocked(getPayload).mockResolvedValue(
      asPayload({
        create,
        update,
        findByID: vi.fn().mockResolvedValue({
          id: 41,
          student,
          course,
          class: null,
          enrollmentStatus: 'NEW',
          paymentStatus: 'UNPAID',
        }),
        logger: { error: vi.fn() },
      }),
    )

    await cancelStudentEnrollment(41, 7)
    await settle()

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'enrollments',
        id: 41,
        data: expect.objectContaining({ enrollmentStatus: 'CANCELLED' }),
      }),
    )
    expect(create).not.toHaveBeenCalled()
    expectNoEmail()
  })
})
