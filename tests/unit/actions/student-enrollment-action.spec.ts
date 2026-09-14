import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Student } from '@/payload-types'

import { createEnrollmentAction } from '@/actions/student/create-enrollment'
import { EnrollmentAlreadyExists } from '@/lib/errors/enrollment'

// Both dependencies reach for the Payload config, which a unit test has no business
// booting. Mocking them leaves exactly what this action is: the decision about who may
// enrol and where an unauthenticated visitor is sent.
vi.mock('@/services/student-enrollment', () => ({
  createStudentEnrollment: vi.fn(),
  ensureCompleteProfile: vi.fn(),
  findCourseSlug: vi.fn(),
}))

vi.mock('@/lib/auth/session-student', () => ({
  getSessionStudent: vi.fn(),
}))

import { getSessionStudent } from '@/lib/auth/session-student'
import {
  createStudentEnrollment,
  ensureCompleteProfile,
  findCourseSlug,
} from '@/services/student-enrollment'

/** Only the fields the action reads. The rest of `Student` is irrelevant to this decision. */
const studentWith = (status: Student['status']) => ({ id: 7, status }) as Student

/** A complete, valid profile — the shape most tests that reach the profile gate submit. */
const validProfile = { fullName: 'Nguyễn Văn A', phone: '0987654321' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(ensureCompleteProfile).mockResolvedValue(undefined)
})

describe('createEnrollmentAction — the sign-in gate', () => {
  it('sends a signed-out visitor to sign-in and enrols nobody', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)
    vi.mocked(findCourseSlug).mockResolvedValue('frontend')

    const result = await createEnrollmentAction({ courseId: 12 })

    expect(result.redirectTo).toBe('/dang-nhap?callbackUrl=%2Fkhoa-hoc%2Ffrontend')
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('builds the return path from the course id, never from the caller', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)
    vi.mocked(findCourseSlug).mockResolvedValue('frontend')

    await createEnrollmentAction({ courseId: 12 })

    expect(findCourseSlug).toHaveBeenCalledWith(12)
  })

  it('never reaches the profile check for a signed-out visitor with no profile fields', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)
    vi.mocked(findCourseSlug).mockResolvedValue('frontend')

    // No fullName/phone sent at all — must not be misread as "profile incomplete".
    const result = await createEnrollmentAction({ courseId: 12 })

    expect(result.redirectTo).toBeDefined()
    expect(ensureCompleteProfile).not.toHaveBeenCalled()
  })
})

describe('createEnrollmentAction — an account that may not enrol', () => {
  it('tells an unverified account to verify, and does not bounce it to sign-in', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('PENDING_VERIFICATION'))

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(result).toEqual({
      status: 'error',
      message: 'Tài khoản chưa xác thực email. Vui lòng xác thực trước khi đăng ký khóa học.',
    })
    expect(result.redirectTo).toBeUndefined()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('tells a disabled account it is disabled, and does not bounce it to sign-in', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('DISABLED'))

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

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
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)

    await expect(createEnrollmentAction({ courseId: 12, ...validProfile })).resolves.toEqual({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    expect(createStudentEnrollment).toHaveBeenCalledWith(12)
  })

  it('rejects an invalid course id before looking anything up', async () => {
    await expect(createEnrollmentAction({ courseId: 0, ...validProfile })).resolves.toEqual({
      status: 'error',
      message: 'Khóa học không hợp lệ.',
    })
    expect(getSessionStudent).not.toHaveBeenCalled()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })
})

describe('createEnrollmentAction — already enrolled', () => {
  it('shows its own message, not the generic fallback or another refusal', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockRejectedValue(new EnrollmentAlreadyExists())

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(result).toEqual({
      status: 'error',
      message: 'Bạn đã đăng ký khóa học này rồi.',
    })
    expect(result.redirectTo).toBeUndefined()
  })
})

describe('createEnrollmentAction — profile completeness (specs/009)', () => {
  it('refuses a signed-in ACTIVE student with a blank full name', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))

    const result = await createEnrollmentAction({ courseId: 12, fullName: '', phone: '0987654321' })

    expect(result.status).toBe('error')
    expect(result.message).not.toBe('Không thể đăng ký khóa học. Vui lòng thử lại.')
    expect(ensureCompleteProfile).not.toHaveBeenCalled()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('refuses a signed-in ACTIVE student with an invalid phone number', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))

    const result = await createEnrollmentAction({
      courseId: 12,
      fullName: 'Nguyễn Văn A',
      phone: '123',
    })

    expect(result.status).toBe('error')
    expect(ensureCompleteProfile).not.toHaveBeenCalled()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('saves the profile before attempting the enrollment, in that order', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)
    const callOrder: string[] = []
    vi.mocked(ensureCompleteProfile).mockImplementation(async () => {
      callOrder.push('ensureCompleteProfile')
    })
    vi.mocked(createStudentEnrollment).mockImplementation(async () => {
      callOrder.push('createStudentEnrollment')
    })

    await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(ensureCompleteProfile).toHaveBeenCalledWith(7, 'Nguyễn Văn A', '0987654321')
    expect(callOrder).toEqual(['ensureCompleteProfile', 'createStudentEnrollment'])
  })

  it('keeps the profile save even when the enrollment attempt fails for an unrelated reason (FR-005)', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockRejectedValue(new EnrollmentAlreadyExists())

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(ensureCompleteProfile).toHaveBeenCalledWith(7, 'Nguyễn Văn A', '0987654321')
    expect(result.message).toBe('Bạn đã đăng ký khóa học này rồi.')
  })
})
