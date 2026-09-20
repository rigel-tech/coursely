import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { sendAdminEnrollmentCreatedEmail, sendEnrollmentConfirmationEmail } from '@/email/send'
import { createStudentEnrollment } from '@/services/student-enrollment'
import type { Student } from '@/payload-types'

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
}))

describe('student enrollment notifications', () => {
  it('creates an in-app notification and sends a confirmation email', async () => {
    const create = vi.fn().mockResolvedValueOnce({ id: 31 }).mockResolvedValueOnce({ id: 32 })
    const student = { id: 7, status: 'ACTIVE', email: 'student@example.com' } as Student
    vi.mocked(getPayload).mockResolvedValue({
      create,
      find: vi.fn((args: { collection: string }) =>
        args.collection === 'courses'
          ? Promise.resolve({ docs: [{ id: 12, title: 'Frontend cơ bản' }] })
          : Promise.resolve({ docs: [] }),
      ),
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

  it('creates the enrollment even when the notification write fails, and logs the failure', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: 31 })
      .mockRejectedValueOnce(new Error('notifications insert failed'))
    const logger = { error: vi.fn() }
    const student = { id: 7, status: 'ACTIVE', email: 'student@example.com' } as Student
    vi.mocked(getPayload).mockResolvedValue({
      create,
      find: vi.fn((args: { collection: string }) =>
        args.collection === 'courses'
          ? Promise.resolve({ docs: [{ id: 12, title: 'Frontend cơ bản' }] })
          : Promise.resolve({ docs: [] }),
      ),
      logger,
    } as never)

    await expect(createStudentEnrollment({ courseId: 12, student })).resolves.toBe(31)

    // Flushes the fire-and-forget notification write's rejection handler.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('ENROLLMENT_CREATED notification'),
    )
  })

  it('sends email to all admin users when a new enrollment is created', async () => {
    const create = vi.fn().mockResolvedValue({ id: 31 })
    const student = {
      id: 7,
      status: 'ACTIVE',
      email: 'student@example.com',
      fullName: 'Nguyễn Văn A',
    } as Student
    vi.mocked(getPayload).mockResolvedValue({
      create,
      find: vi.fn((args: { collection: string }) => {
        if (args.collection === 'courses') {
          return Promise.resolve({ docs: [{ id: 12, title: 'Frontend cơ bản' }] })
        }
        if (args.collection === 'users') {
          return Promise.resolve({
            docs: [
              { id: 1, email: 'admin1@coursely.com' },
              { id: 2, email: 'admin2@coursely.com' },
            ],
          })
        }
        return Promise.resolve({ docs: [] })
      }),
      logger: { error: vi.fn() },
    } as never)

    await createStudentEnrollment({ courseId: 12, student })

    // Flushes fire-and-forget async email tasks
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(sendAdminEnrollmentCreatedEmail).toHaveBeenCalledWith(expect.anything(), {
      to: 'admin1@coursely.com',
      studentNameOrEmail: 'Nguyễn Văn A',
      courseTitle: 'Frontend cơ bản',
    })
    expect(sendAdminEnrollmentCreatedEmail).toHaveBeenCalledWith(expect.anything(), {
      to: 'admin2@coursely.com',
      studentNameOrEmail: 'Nguyễn Văn A',
      courseTitle: 'Frontend cơ bản',
    })
  })
})
