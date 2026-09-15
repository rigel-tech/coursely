import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { sendEnrollmentConfirmationEmail } from '@/email/send'
import { createStudentEnrollment } from '@/services/student-enrollment'
import type { Student } from '@/payload-types'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))
vi.mock('@/email/send', () => ({
  sendEnrollmentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('student enrollment notifications', () => {
  it('creates an in-app notification and sends a confirmation email', async () => {
    const create = vi.fn().mockResolvedValueOnce({ id: 31 }).mockResolvedValueOnce({ id: 32 })
    const findByID = vi.fn().mockResolvedValue({ id: 12, title: 'Frontend cơ bản' })
    const student = { id: 7, status: 'ACTIVE', email: 'student@example.com' } as Student
    vi.mocked(getPayload).mockResolvedValue({
      create,
      db: {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
      },
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID,
      logger: { error: vi.fn() },
    } as never)

    await createStudentEnrollment({ courseId: 12, student })

    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'notifications',
        data: expect.objectContaining({
          student: 7,
          type: 'ENROLLMENT_CREATED',
          metadata: { course: 12 },
        }),
      }),
    )
    expect(sendEnrollmentConfirmationEmail).toHaveBeenCalledWith(expect.anything(), {
      to: 'student@example.com',
      courseTitle: 'Frontend cơ bản',
    })
  })
})
