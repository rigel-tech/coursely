import type { CollectionBeforeChangeHook } from 'payload'

/**
 * `paymentDate` is not staff-entered — it is stamped with the save moment on
 * create and never touched again, so a later edit cannot shift when the
 * payment is recorded as having happened.
 */
export const setPaymentDate: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === 'create') {
    data.paymentDate = new Date().toISOString()
  }

  return data
}
