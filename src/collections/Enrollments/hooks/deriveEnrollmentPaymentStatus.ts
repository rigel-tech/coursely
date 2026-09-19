import type { CollectionBeforeChangeHook } from 'payload'
import { derivePaymentStatus } from '../derivePaymentStatus'
import { Enrollment } from '@/payload-types'

/**
 * `paymentStatus` is never staff-chosen (FR-032) — recomputed on every save from the
 * enrollment's one payment (at most one, per the unique constraint on
 * `Payments.enrollmentId`), overriding whatever was submitted. On create there is never a
 * payment yet — a payment can only be added to an already-saved enrollment — so it is
 * always UNPAID.
 */
export const deriveEnrollmentPaymentStatus: CollectionBeforeChangeHook<Enrollment> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'create') {
    data.paymentStatus = 'UNPAID'
    return data
  }

  const payments = await req.payload.find({
    collection: 'payments',
    where: { enrollmentId: { equals: originalDoc?.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  data.paymentStatus = derivePaymentStatus(payments.docs[0]?.amount ?? 0)

  return data
}
