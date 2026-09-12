import { describe, expect, it } from 'vitest'
import type { PayloadRequest } from 'payload'

import { setCreatedBy } from '@/collections/Students/hooks/setCreatedBy'

const asStaffReq = (id: number) =>
  ({ user: { id, collection: 'users' } }) as unknown as PayloadRequest

const asSelfRegistrationReq = () => ({ user: null }) as unknown as PayloadRequest

describe('Students setCreatedBy hook', () => {
  it('stamps createdBy with the acting staff id on create', () => {
    const result = setCreatedBy({
      data: { email: 'student@example.com' },
      operation: 'create',
      req: asStaffReq(7),
    } as never)

    expect(result.createdBy).toBe(7)
  })

  it('leaves createdBy empty on create with no signed-in staff', () => {
    const result = setCreatedBy({
      data: { email: 'student@example.com', createdBy: 99 },
      operation: 'create',
      req: asSelfRegistrationReq(),
    } as never)

    expect(result.createdBy).toBeUndefined()
  })

  it('does not touch createdBy on update', () => {
    const result = setCreatedBy({
      data: { email: 'student@example.com', createdBy: 3 },
      operation: 'update',
      req: asStaffReq(9),
    } as never)

    expect(result.createdBy).toBe(3)
  })
})
