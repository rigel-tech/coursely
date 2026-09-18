import type { EmailBody } from './verify-otp'

/** `courseTitle` is staff-entered, not this module's own data — escape it before it reaches markup. */
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function createEnrollmentCancelledEmailTemplate(courseTitle: string): EmailBody {
  return {
    subject: 'Đã hủy đăng ký khóa học | Coursely',
    text: `Đơn đăng ký khóa học "${courseTitle}" của bạn đã được hủy thành công.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào bạn,</p>
    <p>Đơn đăng ký khóa học <strong>${escapeHtml(courseTitle)}</strong> của bạn đã được hủy thành công.</p>
  </body>
</html>`,
  }
}
