// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { asPayload } from '../helpers/payload-stub'
import { ClassCourseMismatch, ClassFull, EnrollmentNotAssignable } from '@/lib/errors/enrollment'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))

vi.mock('@/services/class-assignment', () => ({
  assignStudentsToClass: vi.fn(),
}))

const { assignStudentsToClassAction } = await import('@/actions/admin/assign-students-to-class')
const { assignStudentsToClass } = await import('@/services/class-assignment')

const payloadStub = (auth: ReturnType<typeof vi.fn>) => asPayload({ auth })

describe('assignStudentsToClassAction — who may act', () => {
  it('refuses when nobody is signed in', async () => {
    vi.mocked(getPayload).mockResolvedValue(payloadStub(vi.fn().mockResolvedValue({ user: null })))

    const result = await assignStudentsToClassAction({ classId: 4, enrollmentIds: [1] })

    expect(result.status).toBe('error')
    expect(assignStudentsToClass).not.toHaveBeenCalled()
  })

  it('refuses a signed-in student — this is a staff-only action', async () => {
    vi.mocked(getPayload).mockResolvedValue(
      payloadStub(vi.fn().mockResolvedValue({ user: { id: 7, collection: 'students' } })),
    )

    const result = await assignStudentsToClassAction({ classId: 4, enrollmentIds: [1] })

    expect(result.status).toBe('error')
    expect(assignStudentsToClass).not.toHaveBeenCalled()
  })
})

describe('assignStudentsToClassAction — the path that assigns', () => {
  it('delegates to the service and reports how many were assigned', async () => {
    vi.mocked(getPayload).mockResolvedValue(
      payloadStub(vi.fn().mockResolvedValue({ user: { id: 1, collection: 'users' } })),
    )
    vi.mocked(assignStudentsToClass).mockResolvedValue(undefined)

    const result = await assignStudentsToClassAction({ classId: 4, enrollmentIds: [1, 2, 3] })

    expect(result).toEqual({ status: 'success', assigned: 3 })
    expect(assignStudentsToClass).toHaveBeenCalledWith(4, [1, 2, 3])
  })
})

describe('assignStudentsToClassAction — each refusal reaches its own message', () => {
  it.each([
    [new ClassFull({ remaining: 2 })],
    [new ClassCourseMismatch()],
    [new EnrollmentNotAssignable()],
  ])('maps %p to its own message, not the generic fallback', async (error) => {
    vi.mocked(getPayload).mockResolvedValue(
      payloadStub(vi.fn().mockResolvedValue({ user: { id: 1, collection: 'users' } })),
    )
    vi.mocked(assignStudentsToClass).mockRejectedValue(error)

    const result = await assignStudentsToClassAction({ classId: 4, enrollmentIds: [1] })

    expect(result).toEqual({ status: 'error', message: (error as Error).message })
  })

  it('still rethrows an error none of the refusal classes recognise', async () => {
    vi.mocked(getPayload).mockResolvedValue(
      payloadStub(vi.fn().mockResolvedValue({ user: { id: 1, collection: 'users' } })),
    )
    vi.mocked(assignStudentsToClass).mockRejectedValue(new Error('db unreachable'))

    await expect(assignStudentsToClassAction({ classId: 4, enrollmentIds: [1] })).rejects.toThrow(
      'db unreachable',
    )
  })
})
