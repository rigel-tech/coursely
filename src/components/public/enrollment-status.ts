import type { BadgeProps } from '@/components/public/ui/badge'
import type { Enrollment } from '@/payload-types'

/** Label and `Badge` colour for each `enrollmentStatus` — shared by anything that renders it. */
export const ENROLLMENT_STATUS: Record<
  Enrollment['enrollmentStatus'],
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  NEW: { label: 'Mới đăng ký', variant: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'brand' },
  ATTENDED: { label: 'Đã vào học', variant: 'default' },
  COMPLETED: { label: 'Đã hoàn thành', variant: 'success' },
  CANCELLED: { label: 'Đã hủy', variant: 'error' },
}

export const isEnrollmentInProgress = (status: Enrollment['enrollmentStatus']): boolean =>
  status === 'CONFIRMED' || status === 'ATTENDED'
