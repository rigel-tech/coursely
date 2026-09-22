import type { Payment } from '@/payload-types'

/**
 * Every payment method with its labels — the `paymentMethod` field's options and the
 * receipt copy both read this, so a method can never exist in one without the other.
 */
export const PAYMENT_METHOD_LABELS = {
  CASH: { vi: 'Tiền mặt', en: 'Cash' },
  BANK_TRANSFER: { vi: 'Chuyển khoản ngân hàng', en: 'Bank Transfer' },
  CARD: { vi: 'Quẹt thẻ tại quầy', en: 'Card' },
  OTHER: { vi: 'Khác', en: 'Other' },
} satisfies Record<Payment['paymentMethod'], { vi: string; en: string }>
