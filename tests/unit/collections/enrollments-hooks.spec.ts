import { describe, expect, it } from 'vitest'
import type { PayloadRequest } from 'payload'

import { setCreatedBy } from '@/collections/Enrollments/hooks/setCreatedBy'

const asStaffReq = (id: number) =>
  ({ user: { id, collection: 'users' } }) as unknown as PayloadRequest

describe('Enrollments setCreatedBy hook', () => {
  it('stamps the current admin id when an admin creates an enrollment', () => {
    const result = setCreatedBy({
      data: {
        student: 12,
        course: 4,
        createdBy: 99,
        registrationSource: 'SELF_REGISTRATION',
      },
      operation: 'create',
      req: asStaffReq(7),
    } as never)

    expect(result.createdBy).toBe(7)
    expect(result.registrationSource).toBe('ADMIN_CREATED')
  })

  it('clears createdBy when a student creates their own enrollment', () => {
    const result = setCreatedBy({
      data: {
        student: 12,
        course: 4,
        createdBy: 99,
        registrationSource: 'SELF_REGISTRATION',
      },
      operation: 'create',
      req: { user: { id: 12, collection: 'students' } } as unknown as PayloadRequest,
    } as never)

    expect(result.createdBy).toBeUndefined()
    expect(result.registrationSource).toBe('SELF_REGISTRATION')
  })
})
