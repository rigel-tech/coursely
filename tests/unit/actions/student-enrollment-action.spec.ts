import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Student } from '@/payload-types'

import { createEnrollmentAction } from '@/actions/student/create-enrollment'

// Both dependencies reach for the Payload config, which a unit test has no business
// booting. Mocking them leaves exactly what this action is: the decision about who may
// enrol and where an unauthenticated visitor is sent.
vi.mock('@/services/student-enrollment', () => ({
  createStudentEnrollment: vi.fn(),
  findCourseSlug: vi.fn(),
}))

vi.mock('@/lib/auth/session-student', () => ({
  getSessionStudent: vi.fn(),
}))

import { getSessionStudent } from '@/lib/auth/session-student'
import { createStudentEnrollment, findCourseSlug } from '@/services/student-enrollment'

/** Only the fields the action reads. The rest of `Student` is irrelevant to this decision. */
const studentWith = (status: Student['status']) => ({ id: 7, status }) as Student

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createEnrollmentAction — the sign-in gate', () => {
  it('sends a signed-out visitor to sign-in and enrols nobody', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)
    vi.mocked(findCourseSlug).mockResolvedValue('frontend')

    const result = await createEnrollmentAction(12)

    expect(result.redirectTo).toBe('/dang-nhap?callbackUrl=%2Fkhoa-hoc%2Ffrontend')
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('builds the return path from the course id, never from the caller', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)
    vi.mocked(findCourseSlug).mockResolvedValue('frontend')

    await createEnrollmentAction(12)

    expect(findCourseSlug).toHaveBeenCalledWith(12)
  })
})

describe('createEnrollmentAction — an account that may not enrol', () => {
  it('tells an unverified account to verify, and does not bounce it to sign-in', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('PENDING_VERIFICATION'))

    const result = await createEnrollmentAction(12)

    expect(result).toEqual({
      status: 'error',
      message: 'Tài khoản chưa xác thực email. Vui lòng xác thực trước khi đăng ký khóa học.',
    })
    expect(result.redirectTo).toBeUndefined()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('tells a disabled account it is disabled, and does not bounce it to sign-in', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('DISABLED'))

    const result = await createEnrollmentAction(12)

    expect(result).toEqual({
      status: 'error',
      message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ trung tâm để được hỗ trợ.',
    })
    expect(result.redirectTo).toBeUndefined()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })
})

describe('createEnrollmentAction — the path that enrols', () => {
  it('validates the course id and delegates valid input', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockResolvedValue({ id: 31 } as never)

    await expect(createEnrollmentAction(12)).resolves.toEqual({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    expect(createStudentEnrollment).toHaveBeenCalledWith(12)
  })

  it('rejects an invalid course id before looking anything up', async () => {
    await expect(createEnrollmentAction(0)).resolves.toEqual({
      status: 'error',
      message: 'Khóa học không hợp lệ.',
    })
    expect(getSessionStudent).not.toHaveBeenCalled()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })
})
