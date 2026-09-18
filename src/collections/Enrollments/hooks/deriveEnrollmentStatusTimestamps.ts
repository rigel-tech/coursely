import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Stamps the moment an enrollment (re-)enters CONFIRMED or CANCELLED — only when
 * `enrollmentStatus` actually changes into that value on this save, never on an unrelated
 * edit, and freshly on every re-entry (e.g. CONFIRMED → CANCELLED → CONFIRMED updates
 * `confirmedAt` again rather than keeping the first one).
 */
export const deriveEnrollmentStatusTimestamps: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation === 'create') return data

  const previousStatus = originalDoc?.enrollmentStatus
  const nextStatus = 'enrollmentStatus' in data ? data.enrollmentStatus : previousStatus

  if (nextStatus !== previousStatus) {
    const now = new Date().toISOString()
    if (nextStatus === 'CONFIRMED') data.confirmedAt = now
    if (nextStatus === 'CANCELLED') data.cancelledAt = now
  }

  return data
}
