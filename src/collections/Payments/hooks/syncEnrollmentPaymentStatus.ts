import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

const relId = (v: unknown): number =>
  v && typeof v === 'object' ? (v as { id: number }).id : (v as number)

/**
 * A payment's amount is the sole input to its enrollment's derived `paymentStatus`
 * (FR-032–034). Rather than duplicate that derivation here, this re-saves the enrollment
 * with no data changes — `deriveEnrollmentPaymentStatus` (Enrollments' own `beforeChange`
 * hook) recomputes `paymentStatus` from scratch on every save, using whatever payment now
 * exists (or none, after a delete).
 */
export const syncEnrollmentPaymentStatusAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  await req.payload.update({
    collection: 'enrollments',
    id: relId(doc.enrollmentId),
    data: {},
    overrideAccess: true,
    req,
  })
}

export const syncEnrollmentPaymentStatusAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  await req.payload.update({
    collection: 'enrollments',
    id: relId(doc.enrollmentId),
    data: {},
    overrideAccess: true,
    req,
  })
}
