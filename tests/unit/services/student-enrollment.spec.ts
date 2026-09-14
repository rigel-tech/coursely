import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { getSessionStudent } from '@/lib/auth/session-student'
import { createStudentEnrollment } from '@/services/student-enrollment'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))
vi.mock('@/lib/auth/session-student', () => ({ getSessionStudent: vi.fn() }))

describe('createStudentEnrollment', () => {
  it('creates an enrollment for the current student and selected course', async () => {
    const create = vi.fn().mockResolvedValue({ id: 31 })
    const findByID = vi.fn().mockResolvedValue({ id: 12, title: 'Frontend cơ bản' })
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7, status: 'ACTIVE' } as never)
    vi.mocked(getPayload).mockResolvedValue({
      create,
      findByID,
      logger: { error: vi.fn() },
    } as never)

    const result = await createStudentEnrollment(12)

    expect(result).toEqual({ id: 31 })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'enrollments',
        data: expect.objectContaining({
          student: 7,
          course: 12,
          registrationSource: 'SELF_REGISTRATION',
        }),
        draft: false,
        overrideAccess: true,
      }),
    )
  })

  it('rejects enrollment creation without an active student session', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)

    await expect(createStudentEnrollment(12)).rejects.toThrow(
      'Vui lòng đăng nhập để đăng ký khóa học.',
    )
  })
})
