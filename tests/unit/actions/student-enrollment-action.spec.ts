import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'

import type { Student } from '@/payload-types'

import { createEnrollmentAction } from '@/actions/student/create-enrollment'
import {
  CourseNotFound,
  EnrollmentAlreadyExists,
  RegistrationClosed,
  RegistrationNotOpen,
} from '@/lib/errors/enrollment'
import { asPayload } from '../helpers/payload-stub'

// This dependency reaches for the Payload config, which a unit test has no business
// booting. Mocking it leaves exactly what this action is: the decision about who may
// enrol.
vi.mock('@/services/student-enrollment', () => ({
  createStudentEnrollment: vi.fn(),
}))

vi.mock('@/lib/auth/session-student', () => ({
  getSessionStudent: vi.fn(),
}))

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))

import { getSessionStudent } from '@/lib/auth/session-student'
import { createStudentEnrollment } from '@/services/student-enrollment'

const updateStudentProfile = vi.fn()

/** Only the fields the action reads. The rest of `Student` is irrelevant to this decision. */
const studentWith = (
  status: Student['status'],
  profile?: { fullName?: string | null; phone?: string | null },
) => ({ id: 7, status, ...profile }) as Student

/** A complete, valid profile — the shape most tests that reach the profile gate submit. */
const validProfile = { fullName: 'Nguyễn Văn A', phone: '0987654321' }

beforeEach(() => {
  vi.clearAllMocks()
  updateStudentProfile.mockResolvedValue(studentWith('ACTIVE'))
  vi.mocked(getPayload).mockResolvedValue(asPayload({ update: updateStudentProfile }))
})

describe('createEnrollmentAction — the sign-in gate', () => {
  it('refuses a signed-out visitor and enrols nobody', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(result).toEqual({
      status: 'error',
      message: 'Không tìm thấy học sinh trong phiên. Người dùng phải đăng nhập để đăng ký.',
    })
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('rejects blank profile fields before ever checking who is signed in', async () => {
    // The client (CourseRegistrationForm) never sends this — it redirects to sign-in
    // itself when it has no profile. This covers a caller that skips the UI.
    const result = await createEnrollmentAction({ courseId: 12, fullName: '', phone: '' })

    expect(result).toEqual({
      status: 'error',
      message:
        'Vui lòng nhập họ và tên. Vui lòng nhập số điện thoại. Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)',
    })
    expect(getSessionStudent).not.toHaveBeenCalled()
    expect(updateStudentProfile).not.toHaveBeenCalled()
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
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('tells a disabled account it is disabled, and does not bounce it to sign-in', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('DISABLED'))

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(result).toEqual({
      status: 'error',
      message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ trung tâm để được hỗ trợ.',
    })
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
    expect(createStudentEnrollment).toHaveBeenCalledWith({
      courseId: 12,
      student: studentWith('ACTIVE'),
    })
  })

  it('rejects an invalid course id before looking anything up', async () => {
    await expect(createEnrollmentAction({ courseId: 0, ...validProfile })).resolves.toEqual({
      status: 'error',
      message: 'Khóa học không hợp lệ.',
    })
    expect(getSessionStudent).not.toHaveBeenCalled()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('rejects a course id of the wrong type — Server Action input is client-controlled', async () => {
    await expect(
      createEnrollmentAction({ courseId: 'abc' as unknown as number, ...validProfile }),
    ).resolves.toEqual({
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
  })
})

describe('createEnrollmentAction — course refusals reach their own message', () => {
  it('shows the course-not-found message, not the generic fallback', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockRejectedValue(new CourseNotFound())

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(result).toEqual({ status: 'error', message: 'Khóa học không tồn tại.' })
  })

  it('shows the registration-not-open message, not the generic fallback', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockRejectedValue(new RegistrationNotOpen())

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(result).toEqual({
      status: 'error',
      message: 'Khóa học chưa đến thời gian mở đăng ký.',
    })
  })

  it('shows the registration-closed message, not the generic fallback', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockRejectedValue(new RegistrationClosed())

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(result).toEqual({
      status: 'error',
      message: 'Thời hạn đăng ký khóa học này đã kết thúc.',
    })
  })

  it('still rethrows an error none of the refusal classes recognise', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockRejectedValue(new Error('db unreachable'))

    await expect(createEnrollmentAction({ courseId: 12, ...validProfile })).rejects.toThrow(
      'db unreachable',
    )
  })
})

describe('createEnrollmentAction — profile completeness (specs/009)', () => {
  it('refuses a signed-in ACTIVE student with a blank full name', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))

    const result = await createEnrollmentAction({ courseId: 12, fullName: '', phone: '0987654321' })

    expect(result.status).toBe('error')
    expect(result.message).not.toBe('Không thể đăng ký khóa học. Vui lòng thử lại.')
    expect(updateStudentProfile).not.toHaveBeenCalled()
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
    expect(updateStudentProfile).not.toHaveBeenCalled()
    expect(createStudentEnrollment).not.toHaveBeenCalled()
  })

  it('saves the profile before attempting the enrollment, in that order', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)
    const callOrder: string[] = []
    updateStudentProfile.mockImplementation(async () => {
      callOrder.push('updateStudentProfile')
      return studentWith('ACTIVE')
    })
    vi.mocked(createStudentEnrollment).mockImplementation(async () => {
      callOrder.push('createStudentEnrollment')
    })

    await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(updateStudentProfile).toHaveBeenCalledWith({
      collection: 'students',
      id: 7,
      data: { fullName: 'Nguyễn Văn A', phone: '0987654321' },
      overrideAccess: true,
    })
    expect(callOrder).toEqual(['updateStudentProfile', 'createStudentEnrollment'])
  })

  it('keeps the profile save even when the enrollment attempt fails for an unrelated reason (FR-005)', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(createStudentEnrollment).mockRejectedValue(new EnrollmentAlreadyExists())

    const result = await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(updateStudentProfile).toHaveBeenCalledWith({
      collection: 'students',
      id: 7,
      data: { fullName: 'Nguyễn Văn A', phone: '0987654321' },
      overrideAccess: true,
    })
    expect(result.message).toBe('Bạn đã đăng ký khóa học này rồi.')
  })
})

describe('createEnrollmentAction — skips the profile write when nothing changed', () => {
  it('does not call updateStudentProfile when the submitted profile matches the stored one', async () => {
    const student = studentWith('ACTIVE', validProfile)
    vi.mocked(getSessionStudent).mockResolvedValue(student)
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)

    await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(updateStudentProfile).not.toHaveBeenCalled()
  })

  it('still enrols when the profile write is skipped', async () => {
    const student = studentWith('ACTIVE', validProfile)
    vi.mocked(getSessionStudent).mockResolvedValue(student)
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)

    await createEnrollmentAction({ courseId: 12, ...validProfile })

    expect(createStudentEnrollment).toHaveBeenCalledWith({ courseId: 12, student })
  })

  it('still calls updateStudentProfile when the stored profile differs', async () => {
    const student = studentWith('ACTIVE', validProfile)
    vi.mocked(getSessionStudent).mockResolvedValue(student)
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)

    await createEnrollmentAction({ courseId: 12, fullName: 'Trần Thị B', phone: '0912345678' })

    expect(updateStudentProfile).toHaveBeenCalledWith({
      collection: 'students',
      id: 7,
      data: { fullName: 'Trần Thị B', phone: '0912345678' },
      overrideAccess: true,
    })
  })

  it('still calls updateStudentProfile with both fields when only the phone differs', async () => {
    const student = studentWith('ACTIVE', validProfile)
    vi.mocked(getSessionStudent).mockResolvedValue(student)
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)

    await createEnrollmentAction({
      courseId: 12,
      fullName: validProfile.fullName,
      phone: '0912345678',
    })

    expect(updateStudentProfile).toHaveBeenCalledWith({
      collection: 'students',
      id: 7,
      data: { fullName: validProfile.fullName, phone: '0912345678' },
      overrideAccess: true,
    })
  })

  it('still calls updateStudentProfile with both fields when only the full name differs', async () => {
    const student = studentWith('ACTIVE', validProfile)
    vi.mocked(getSessionStudent).mockResolvedValue(student)
    vi.mocked(createStudentEnrollment).mockResolvedValue(undefined)

    await createEnrollmentAction({
      courseId: 12,
      fullName: 'Trần Thị B',
      phone: validProfile.phone,
    })

    expect(updateStudentProfile).toHaveBeenCalledWith({
      collection: 'students',
      id: 7,
      data: { fullName: 'Trần Thị B', phone: validProfile.phone },
      overrideAccess: true,
    })
  })
})
