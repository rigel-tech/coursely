import { formatAmountDisplay } from '@/collections/Payments/formatAmount'
import { PAYMENT_METHOD_LABELS } from '@/collections/Payments/paymentMethods'
import type { PaymentRecordedTemplateInput } from '@/notifications/types'
import { formatDate } from '@/utilities/formatDateTime'
import { escapeHtml } from './escape-html'
import type { EmailBody } from './verify-otp'

export function createPaymentRecordedEmailTemplate({
  studentNameOrEmail,
  courseTitle,
  amount,
  paymentMethod,
  paymentDate,
  referenceNote,
}: PaymentRecordedTemplateInput): EmailBody {
  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod].vi
  const formattedAmount = `${formatAmountDisplay(amount)} VND`
  const formattedDate = formatDate(paymentDate)

  return {
    subject: `[Coursely] Biên nhận thanh toán: ${courseTitle}`,
    text: `Chào ${studentNameOrEmail},\n\nCoursely đã ghi nhận thanh toán của bạn cho khóa học "${courseTitle}".\n- Số tiền: ${formattedAmount}\n- Phương thức: ${methodLabel}\n- Ngày thanh toán: ${formattedDate}${referenceNote ? `\n- Ghi chú/Mã tham chiếu: ${referenceNote}` : ''}\n\nCảm ơn bạn đã tin tưởng Coursely!`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào <strong>${escapeHtml(studentNameOrEmail)}</strong>,</p>
    <p>Coursely xác nhận đã nhận khoản thanh toán của bạn cho khóa học <strong>${escapeHtml(courseTitle)}</strong>.</p>
    <div>
      <p><strong>Số tiền:</strong> ${escapeHtml(formattedAmount)}</p>
      <p><strong>Phương thức:</strong> ${escapeHtml(methodLabel)}</p>
      <p><strong>Ngày thanh toán:</strong> ${escapeHtml(formattedDate)}</p>
      ${referenceNote ? `<p><strong>Ghi chú:</strong> ${escapeHtml(referenceNote)}</p>` : ''}
    </div>
    <p>Bạn có thể theo dõi tiến trình và trạng thái học tập trong trang tài khoản cá nhân.</p>
  </body>
</html>`,
  }
}
