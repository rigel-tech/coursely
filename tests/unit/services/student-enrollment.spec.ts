import { describe, expect, it, vi } from 'vitest'

import { getPayload, ValidationError } from 'payload'
import { getSessionStudent } from '@/lib/auth/session-student'
import { createStudentEnrollment, ensureCompleteProfile } from '@/services/student-enrollment'
import { EnrollmentAlreadyExists } from '@/lib/errors/enrollment'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))
vi.mock('@/lib/auth/session-student', () => ({ getSessionStudent: vi.fn() }))

/** A `payload` stand-in with no existing enrollment and no `db` transaction plumbing. */
const payloadStub = (overrides: {
  create?: ReturnType<typeof vi.fn>
  find?: ReturnType<typeof vi.fn>
  update?: ReturnType<typeof vi.fn>
}) => ({
  create: overrides.create ?? vi.fn().mockResolvedValue({ id: 31 }),
  db: {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
  },
  find: overrides.find ?? vi.fn().mockResolvedValue({ docs: [] }),
  findByID: vi.fn().mockResolvedValue({ id: 12, title: 'Frontend cơ bản' }),
  logger: { error: vi.fn() },
  update: overrides.update ?? vi.fn().mockResolvedValue({ id: 7 }),
})

describe('createStudentEnrollment', () => {
  it('creates an enrollment for the current student and selected course', async () => {
    const create = vi.fn().mockResolvedValue({ id: 31 })
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7, status: 'ACTIVE' } as never)
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ create }) as never)

    await expect(createStudentEnrollment(12)).resolves.toBeUndefined()
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

describe('createStudentEnrollment — the duplicate guard', () => {
  it('refuses when an active enrollment for this student and course already exists', async () => {
    const create = vi.fn()
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 99, enrollmentStatus: 'NEW' }] })
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7, status: 'ACTIVE' } as never)
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ create, find }) as never)

    await expect(createStudentEnrollment(12)).rejects.toBeInstanceOf(EnrollmentAlreadyExists)
    expect(create).not.toHaveBeenCalled()
  })

  it('scopes the pre-check to exclude CANCELLED enrollments (FR-008)', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7, status: 'ACTIVE' } as never)
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ find }) as never)

    await createStudentEnrollment(12)

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'enrollments',
        where: expect.objectContaining({
          and: expect.arrayContaining([
            expect.objectContaining({ enrollmentStatus: { not_equals: 'CANCELLED' } }),
          ]),
        }),
      }),
    )
  })

  it('treats a database-level unique violation the same as the pre-check catching it', async () => {
    // The race the pre-check cannot close on its own (FR-002): two requests both see no
    // existing enrollment, both proceed to create — the partial unique index is what
    // actually stops the second one, and Payload's Postgres adapter surfaces that as a
    // ValidationError, not the raw driver error (see research.md Decision 2).
    const create = vi
      .fn()
      .mockRejectedValue(new ValidationError({ collection: 'enrollments', errors: [] }))
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7, status: 'ACTIVE' } as never)
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ create }) as never)

    await expect(createStudentEnrollment(12)).rejects.toBeInstanceOf(EnrollmentAlreadyExists)
  })
})

// specs/009-enrollment-profile-completeness
describe('ensureCompleteProfile', () => {
  it('saves the submitted full name and phone on the student record', async () => {
    const update = vi.fn().mockResolvedValue({ id: 7 })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ update }) as never)

    await ensureCompleteProfile(7, 'Nguyễn Văn A', '0987654321')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        id: 7,
        data: { fullName: 'Nguyễn Văn A', phone: '0987654321' },
        overrideAccess: true,
      }),
    )
  })
})
