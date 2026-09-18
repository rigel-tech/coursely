export type DerivedPaymentStatus = 'UNPAID' | 'PAID'

/**
 * FR-032 — never staff-chosen. With one payment per enrollment (the unique constraint on
 * `Payments.enrollmentId`) and no partial-payment tracking, a payment of any amount marks
 * the enrollment PAID.
 */
export const derivePaymentStatus = (paidAmount: number): DerivedPaymentStatus =>
  paidAmount > 0 ? 'PAID' : 'UNPAID'
