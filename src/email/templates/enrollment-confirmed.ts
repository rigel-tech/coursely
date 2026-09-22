import { escapeHtml } from './escape-html'
import type { EmailBody } from './verify-otp'

export function createEnrollmentConfirmedEmailTemplate(courseTitle: string): EmailBody {
  return {
    subject: 'Đơn đăng ký khóa học đã được xác nhận | Coursely',
    text: `Đơn đăng ký khóa học "${courseTitle}" của bạn đã được xác nhận thành công. Coursely sẽ sớm thông báo khi có lịch xếp lớp chi tiết.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào bạn,</p>
    <p>Đơn đăng ký khóa học <strong>${escapeHtml(courseTitle)}</strong> của bạn đã được xác nhận thành công.</p>
    <p>Coursely sẽ sớm thông báo khi có lịch xếp lớp chi tiết.</p>
  </body>
</html>`,
  }
}
