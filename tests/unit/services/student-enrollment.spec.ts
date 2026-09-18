import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { asPayload } from '../helpers/payload-stub'
import {
  createStudentEnrollment,
  findCourseSlug,
  getActiveEnrollmentStatus,
  isEnrollmentCancellable,
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
 * A `payload` stand-in with a published, open-for-registration course and no existing
 * enrollment. `find` is routed by `collection` so a course lookup and an enrollment lookup
 * can be stubbed independently.
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
    find: vi.fn((args: { collection: string }) =>
      args.collection === 'courses' ? courseFind(args) : enrollmentFind(args),
    ),
    logger: { error: vi.fn() },
  }
}

describe('createStudentEnrollment', () => {
  it('creates an enrollment for the given student and course, resolving its new id', async () => {
    const create = vi.fn().mockResolvedValue({ id: 31 })
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ create })))

    await expect(createStudentEnrollment({ courseId: 12, student: activeStudent })).resolves.toBe(
      31,
    )
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
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ courseFind })))

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
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ courseFind })))

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).rejects.toBeInstanceOf(RegistrationNotOpen)
  })

  it('refuses a course whose registration deadline has passed', async () => {
    const courseFind = vi.fn().mockResolvedValue({
      docs: [{ ...publishedCourse, registrationEndAt: '2000-01-01T00:00:00.000Z' }],
    })
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ courseFind })))

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
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ create, enrollmentFind })))

    await expect(
      createStudentEnrollment({ courseId: 12, student: activeStudent }),
    ).rejects.toBeInstanceOf(EnrollmentAlreadyExists)
    expect(create).not.toHaveBeenCalled()
  })

  it('scopes the pre-check to exclude CANCELLED enrollments (FR-008)', async () => {
    const enrollmentFind = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ enrollmentFind })))

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
})

describe('getActiveEnrollmentStatus', () => {
  it("returns undefined when the student's only enrollment for the course is CANCELLED", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayload).mockResolvedValue(asPayload({ find }))

    const payload = await getPayload({} as never)
    await expect(getActiveEnrollmentStatus(payload, 7, 12)).resolves.toBeUndefined()
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

  it('returns the active enrollment, including whether it can be self-cancelled', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 99, enrollmentStatus: 'CONFIRMED', paymentStatus: 'UNPAID' }],
    })
    vi.mocked(getPayload).mockResolvedValue(asPayload({ find }))

    const payload = await getPayload({} as never)
    await expect(getActiveEnrollmentStatus(payload, 7, 12)).resolves.toEqual({
      id: 99,
      enrollmentStatus: 'CONFIRMED',
      canCancel: true,
    })
  })

  it('reports canCancel: false when the enrollment is already paid', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 99, enrollmentStatus: 'CONFIRMED', paymentStatus: 'PAID' }],
    })
    vi.mocked(getPayload).mockResolvedValue(asPayload({ find }))

    const payload = await getPayload({} as never)
    await expect(getActiveEnrollmentStatus(payload, 7, 12)).resolves.toEqual({
      id: 99,
      enrollmentStatus: 'CONFIRMED',
      canCancel: false,
    })
  })
})

describe('isEnrollmentCancellable', () => {
  const NOW = new Date('2026-06-15T00:00:00.000Z')
  const FUTURE = '2026-07-01T00:00:00.000Z'
  const PAST = '2026-06-01T00:00:00.000Z'

  it.each([
    ['NEW + UNPAID + no class', { enrollmentStatus: 'NEW', paymentStatus: 'UNPAID' }, true],
    [
      'CONFIRMED + UNPAID + no class',
      { enrollmentStatus: 'CONFIRMED', paymentStatus: 'UNPAID' },
      true,
    ],
    [
      'CONFIRMED + UNPAID + class not started',
      { enrollmentStatus: 'CONFIRMED', paymentStatus: 'UNPAID', class: { startDate: FUTURE } },
      true,
    ],
    ['NEW + PAID', { enrollmentStatus: 'NEW', paymentStatus: 'PAID' }, false],
    ['CONFIRMED + PAID', { enrollmentStatus: 'CONFIRMED', paymentStatus: 'PAID' }, false],
    [
      'CONFIRMED + PARTIALLY_PAID',
      { enrollmentStatus: 'CONFIRMED', paymentStatus: 'PARTIALLY_PAID' },
      false,
    ],
    [
      'CONFIRMED + UNPAID + class already started',
      { enrollmentStatus: 'CONFIRMED', paymentStatus: 'UNPAID', class: { startDate: PAST } },
      false,
    ],
    [
      'CONFIRMED + UNPAID + class starts exactly now (boundary)',
      {
        enrollmentStatus: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        class: { startDate: NOW.toISOString() },
      },
      false,
    ],
    ['ATTENDED + UNPAID', { enrollmentStatus: 'ATTENDED', paymentStatus: 'UNPAID' }, false],
    ['COMPLETED + UNPAID', { enrollmentStatus: 'COMPLETED', paymentStatus: 'UNPAID' }, false],
    ['CANCELLED + UNPAID', { enrollmentStatus: 'CANCELLED', paymentStatus: 'UNPAID' }, false],
  ] as const)('%s → %s', (_label, enrollment, expected) => {
    expect(isEnrollmentCancellable(enrollment as never, NOW)).toBe(expected)
  })
})

describe('findCourseSlug', () => {
  it('returns the slug of a published course', async () => {
    const courseFind = vi
      .fn()
      .mockResolvedValue({ docs: [{ ...publishedCourse, slug: 'frontend' }] })
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ courseFind })))

    await expect(findCourseSlug(12)).resolves.toBe('frontend')
  })

  it('returns null for a course that has never been published', async () => {
    const courseFind = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayload).mockResolvedValue(asPayload(payloadStub({ courseFind })))

    await expect(findCourseSlug(12)).resolves.toBeNull()
    expect(courseFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ _status: { equals: 'published' } }),
      }),
    )
  })
})
