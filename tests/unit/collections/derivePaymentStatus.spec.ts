import { describe, expect, it } from 'vitest'

import { derivePaymentStatus } from '@/collections/Enrollments/derivePaymentStatus'

describe('derivePaymentStatus', () => {
  it('returns UNPAID when there is no payment', () => {
    expect(derivePaymentStatus(0)).toBe('UNPAID')
  })

  it('returns PAID for any positive payment', () => {
    expect(derivePaymentStatus(1)).toBe('PAID')
    expect(derivePaymentStatus(500000)).toBe('PAID')
    expect(derivePaymentStatus(1000000)).toBe('PAID')
    expect(derivePaymentStatus(1500000)).toBe('PAID')
  })
})
