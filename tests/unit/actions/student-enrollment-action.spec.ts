import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEnrollmentAction } from '@/actions/student/create-enrollment'

vi.mock('@/services/student-enrollment', () => ({
  createStudentEnrollment: vi.fn(),
}))

import { createStudentEnrollment } from '@/services/student-enrollment'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createEnrollmentAction', () => {
  it('validates the course id and delegates valid input', async () => {
    vi.mocked(createStudentEnrollment).mockResolvedValue({ id: 31 } as never)

    await expect(createEnrollmentAction(12)).resolves.toEqual({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    expect(createStudentEnrollment).toHaveBeenCalledWith(12)
  })

  it('rejects an invalid course id before calling the service', async () => {
    await expect(createEnrollmentAction(0)).resolves.toEqual({
      status: 'error',
      message: 'Khóa học không hợp lệ.',
    })
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })
})
