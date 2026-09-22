import { escapeHtml } from './escape-html'
import type { EmailBody } from './verify-otp'

export function createEnrollmentCreatedEmailTemplate(courseTitle: string): EmailBody {
  return {
    subject: 'Đăng ký khóa học thành công | Coursely',
    text: `Bạn đã đăng ký khóa học "${courseTitle}" thành công. Đơn đăng ký đang chờ trung tâm xác nhận.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào bạn,</p>
    <p>Bạn đã đăng ký khóa học <strong>${escapeHtml(courseTitle)}</strong> thành công.</p>
    <p>Đơn đăng ký đang chờ trung tâm xác nhận. Coursely sẽ thông báo khi trạng thái thay đổi.</p>
  </body>
</html>`,
  }
}
