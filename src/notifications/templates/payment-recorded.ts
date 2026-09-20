import { formatAmountDisplay } from '@/collections/Payments/formatAmount'
import type { PaymentInfo } from '../types'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  CARD: 'Quẹt thẻ tại quầy',
  OTHER: 'Khác',
}

export type PaymentRecordedNotificationInput = Pick<
  PaymentInfo,
  'courseTitle' | 'amount' | 'paymentMethod'
>

export function createStudentPaymentRecordedNotificationTemplate({
  courseTitle,
  amount,
  paymentMethod,
}: PaymentRecordedNotificationInput): { title: string; content: string } {
  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod
  const formattedAmount = `${formatAmountDisplay(amount)} VND`

  return {
    title: `Xác nhận thanh toán: ${courseTitle}`,
    content: `Đã ghi nhận thanh toán thành công số tiền ${formattedAmount} cho khóa học "${courseTitle}" qua hình thức ${methodLabel}.`,
  }
}
