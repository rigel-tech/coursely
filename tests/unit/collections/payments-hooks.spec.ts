import { describe, expect, it } from 'vitest'
import type { PayloadRequest } from 'payload'

import { setRecordedByUser } from '@/collections/Payments/hooks/setRecordedByUser'

const asStaffReq = (id: number) =>
  ({ user: { id, collection: 'users' } }) as unknown as PayloadRequest

describe('Payments setRecordedByUser hook', () => {
  it('stamps the current staff id when a staff account creates a payment', () => {
    const result = setRecordedByUser({
      data: { amount: 500000 },
      operation: 'create',
      req: asStaffReq(7),
    } as never)

    expect(result.userId).toBe(7)
  })

  it('does not stamp a student principal as the recorder', () => {
    const result = setRecordedByUser({
      data: { amount: 500000 },
      operation: 'create',
      req: { user: { id: 12, collection: 'students' } } as unknown as PayloadRequest,
    } as never)

    expect(result.userId).toBeUndefined()
  })
})
