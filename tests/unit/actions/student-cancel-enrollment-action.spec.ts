import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Student } from '@/payload-types'

import { cancelEnrollmentAction } from '@/actions/student/cancel-enrollment'
import {
  EnrollmentAlreadyCancelled,
  EnrollmentAlreadyStarted,
  EnrollmentHasPayment,
  EnrollmentNotCancellable,
  EnrollmentNotFound,
} from '@/lib/errors/enrollment'

vi.mock('@/services/student-enrollment', () => ({
  cancelStudentEnrollment: vi.fn(),
}))

vi.mock('@/lib/auth/session-student', () => ({
  ensureSessionStudent: vi.fn(),
}))

import { ensureSessionStudent } from '@/lib/auth/session-student'
import { cancelStudentEnrollment } from '@/services/student-enrollment'

const studentWith = (status: Student['status']) => ({ id: 7, status }) as Student

beforeEach(() => {
  vi.clearAllMocks()
})

describe('cancelEnrollmentAction — the sign-in gate', () => {
  it('refuses a signed-out visitor and cancels nothing', async () => {
    vi.mocked(ensureSessionStudent).mockResolvedValue(null)

    const result = await cancelEnrollmentAction(99)

    expect(result.status).toBe('error')
    expect(cancelStudentEnrollment).not.toHaveBeenCalled()
  })
})

describe('cancelEnrollmentAction — an account that may not act', () => {
  it('refuses a PENDING_VERIFICATION account', async () => {
    vi.mocked(ensureSessionStudent).mockResolvedValue(studentWith('PENDING_VERIFICATION'))

    const result = await cancelEnrollmentAction(99)

    expect(result.status).toBe('error')
    expect(cancelStudentEnrollment).not.toHaveBeenCalled()
  })

  it('refuses a DISABLED account', async () => {
    vi.mocked(ensureSessionStudent).mockResolvedValue(studentWith('DISABLED'))

    const result = await cancelEnrollmentAction(99)

    expect(result.status).toBe('error')
    expect(cancelStudentEnrollment).not.toHaveBeenCalled()
  })
})

describe('cancelEnrollmentAction — the path that cancels', () => {
  it('delegates to the service and reports success', async () => {
    vi.mocked(ensureSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(cancelStudentEnrollment).mockResolvedValue(undefined)

    const result = await cancelEnrollmentAction(99)

    expect(result.status).toBe('success')
    expect(cancelStudentEnrollment).toHaveBeenCalledWith(99, 7)
  })
})

describe('cancelEnrollmentAction — each refusal reaches its own message', () => {
  it.each([
    [new EnrollmentNotFound()],
    [new EnrollmentAlreadyCancelled()],
    [new EnrollmentNotCancellable()],
    [new EnrollmentHasPayment()],
    [new EnrollmentAlreadyStarted()],
  ])('maps %p to its own message, not the generic fallback', async (error) => {
    vi.mocked(ensureSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(cancelStudentEnrollment).mockRejectedValue(error)

    const result = await cancelEnrollmentAction(99)

    expect(result.status).toBe('error')
    expect(result.message).toBe((error as Error).message)
  })

  it('still rethrows an error none of the refusal classes recognise', async () => {
    vi.mocked(ensureSessionStudent).mockResolvedValue(studentWith('ACTIVE'))
    vi.mocked(cancelStudentEnrollment).mockRejectedValue(new Error('db unreachable'))

    await expect(cancelEnrollmentAction(99)).rejects.toThrow('db unreachable')
  })
})
