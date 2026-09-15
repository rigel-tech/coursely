import { describe, expect, it, vi } from 'vitest'

import { getPayload, ValidationError } from 'payload'
import {
  createStudentEnrollment,
  findCourseSlug,
  getActiveEnrollmentStatus,
} from '@/services/student-enrollment'
import {
  CourseNotFound,
  EnrollmentAlreadyExists,
  RegistrationClosed,
  RegistrationNotOpen,
} from '@/lib/errors/enrollment'
import type { Student } from '@/payload-types'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))

const activeStudent = { id: 7, status: 'ACTIVE' } as Student

const publishedCourse = {
  id: 12,
  title: 'Frontend cơ bản',
  registrationStartAt: null,
  registrationEndAt: null,
}

/**
 * A `payload` stand-in with a published, open-for-registration course, no existing
 * enrollment, and no `db` transaction plumbing. `find` is routed by `collection` so a
 * course lookup and an enrollment lookup can be stubbed independently.
 */
type FindMock = (args: { collection: string }) => Promise<{ docs: unknown[] }>

const payloadStub = (overrides: {
  create?: ReturnType<typeof vi.fn>
  courseFind?: FindMock
  enrollmentFind?: FindMock
}) => {
  const courseFind = overrides.courseFind ?? vi.fn().mockResolvedValue({ docs: [publishedCourse] })
  const enrollmentFind = overrides.enrollmentFind ?? vi.fn().mockResolvedValue({ docs: [] })

  return {
    create: overrides.create ?? vi.fn().mockResolvedValue({ id: 31 }),
    db: {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
    },
    find: vi.fn((args: { collection: string }) =>
      args.collection === 'courses' ? courseFind(args) : enrollmentFind(args),
    ),
    logger: { error: vi.fn() },
  }
}

describe('createStudentEnrollment', () => {
  it('creates an enrollment for the given student and course', async () => {
    const create = vi.fn().mockResolvedValue({ id: 31 })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ create }) as never)

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).resolves.toBeUndefined()
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
})

describe('createStudentEnrollment — course validity', () => {
  it('refuses a course that has never been published (draft-only)', async () => {
    const courseFind = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ courseFind }) as never)

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).rejects.toBeInstanceOf(CourseNotFound)
    expect(courseFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'courses',
        where: expect.objectContaining({
          _status: { equals: 'published' },
        }),
      }),
    )
  })

  it('refuses a course whose registration has not opened yet', async () => {
    const courseFind = vi.fn().mockResolvedValue({
      docs: [{ ...publishedCourse, registrationStartAt: '2099-01-01T00:00:00.000Z' }],
    })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ courseFind }) as never)

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).rejects.toBeInstanceOf(RegistrationNotOpen)
  })

  it('refuses a course whose registration deadline has passed', async () => {
    const courseFind = vi.fn().mockResolvedValue({
      docs: [{ ...publishedCourse, registrationEndAt: '2000-01-01T00:00:00.000Z' }],
    })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ courseFind }) as never)

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).rejects.toBeInstanceOf(RegistrationClosed)
  })
})

describe('createStudentEnrollment — the duplicate guard', () => {
  it('refuses when an active enrollment for this student and course already exists', async () => {
    const create = vi.fn()
    const enrollmentFind = vi
      .fn()
      .mockResolvedValue({ docs: [{ id: 99, enrollmentStatus: 'NEW' }] })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ create, enrollmentFind }) as never)

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).rejects.toBeInstanceOf(EnrollmentAlreadyExists)
    expect(create).not.toHaveBeenCalled()
  })

  it('scopes the pre-check to exclude CANCELLED enrollments (FR-008)', async () => {
    const enrollmentFind = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ enrollmentFind }) as never)

    await createStudentEnrollment({ courseId: 12, student: activeStudent })

    expect(enrollmentFind).toHaveBeenCalledWith(
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
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ create }) as never)

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).rejects.toBeInstanceOf(EnrollmentAlreadyExists)
  })
})

describe('getActiveEnrollmentStatus', () => {
  it("returns undefined when the student's only enrollment for the course is CANCELLED", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayload).mockResolvedValue({ find } as never)

    const payload = await getPayload({} as never)
    await expect(
      getActiveEnrollmentStatus(payload, { studentId: 7, courseId: 12 }),
    ).resolves.toBeUndefined()
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

  it('returns the active enrollment status when one exists', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 99, enrollmentStatus: 'CONFIRMED' }] })
    vi.mocked(getPayload).mockResolvedValue({ find } as never)

    const payload = await getPayload({} as never)
    await expect(getActiveEnrollmentStatus(payload, { studentId: 7, courseId: 12 })).resolves.toBe(
      'CONFIRMED',
    )
  })
})

describe('findCourseSlug', () => {
  it('returns the slug of a published course', async () => {
    const courseFind = vi
      .fn()
      .mockResolvedValue({ docs: [{ ...publishedCourse, slug: 'frontend' }] })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ courseFind }) as never)

    await expect(findCourseSlug(12)).resolves.toBe('frontend')
  })

  it('returns null for a course that has never been published', async () => {
    const courseFind = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ courseFind }) as never)

    await expect(findCourseSlug(12)).resolves.toBeNull()
    expect(courseFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ _status: { equals: 'published' } }),
      }),
    )
  })
})
