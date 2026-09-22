import type { CollectionAfterChangeHook } from 'payload'

import { queueNotification } from '@/notifications/queue'
import type { Payment } from '@/payload-types'

/** Queues the student's receipt for a newly recorded payment (`queue.ts`); an edit sends nothing. */
export const notifyOnPaymentRecorded: CollectionAfterChangeHook<Payment> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation === 'create') {
    await queueNotification(req, { task: 'notifyPaymentRecorded', input: { paymentId: doc.id } })
  }

  return doc
}
