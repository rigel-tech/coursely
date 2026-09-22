import { formatAmountDisplay } from '@/collections/Payments/formatAmount'
import { PAYMENT_METHOD_LABELS } from '@/collections/Payments/paymentMethods'
import type { PaymentInfo } from '../types'

export function createStudentPaymentRecordedNotificationTemplate({
  courseTitle,
  amount,
  paymentMethod,
}: Pick<PaymentInfo, 'courseTitle' | 'amount' | 'paymentMethod'>): {
  title: string
  content: string
} {
  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod].vi
  const formattedAmount = `${formatAmountDisplay(amount)} VND`

  return {
    title: `Xác nhận thanh toán: ${courseTitle}`,
    content: `Đã ghi nhận thanh toán thành công số tiền ${formattedAmount} cho khóa học "${courseTitle}" qua hình thức ${methodLabel}.`,
  }
}
