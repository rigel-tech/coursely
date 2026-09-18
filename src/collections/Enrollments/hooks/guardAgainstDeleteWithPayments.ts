import type { CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

/**
 * `payments.enrollment_id_id` is a NOT NULL foreign key with `ON DELETE restrict`
 * (`src/migrations/20260917_150000_convert_payments_enrollment_id_to_relationship.ts`),
 * so Postgres would otherwise reject this delete with a raw constraint-violation error.
 * Reject it here first with a message staff can act on.
 */
export const guardAgainstDeleteWithPayments: CollectionBeforeDeleteHook = async ({
  id,
  req,
}): Promise<void> => {
  const { totalDocs } = await req.payload.count({
    collection: 'payments',
    where: {
      enrollmentId: {
        equals: id,
      },
    },
    req,
  })

  if (totalDocs > 0) {
    throw new APIError(
      'Đơn đăng ký này đã có thanh toán, không thể xoá. Hãy xoá các bản ghi thanh toán liên quan trước.',
      400,
    )
  }
}
