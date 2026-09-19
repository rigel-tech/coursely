import type { BadgeProps } from '@/components/public/ui/badge'
import type { Enrollment } from '@/payload-types'

/** Label and `Badge` colour for each `paymentStatus` — shared by anything that renders it. */
export const PAYMENT_STATUS_LABELS: Record<
  Enrollment['paymentStatus'],
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  UNPAID: { label: 'Chưa thanh toán', variant: 'warning' },
  PAID: { label: 'Đã thanh toán', variant: 'success' },
}
