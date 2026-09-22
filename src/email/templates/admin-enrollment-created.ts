import { escapeHtml } from './escape-html'
import type { EmailBody } from './verify-otp'

export function createAdminEnrollmentCreatedEmailTemplate(
  studentNameOrEmail: string,
  courseTitle: string,
): EmailBody {
  return {
    subject: `[Admin] Đơn đăng ký mới: ${courseTitle} | Coursely`,
    text: `Hệ thống vừa ghi nhận đơn đăng ký mới từ học viên ${studentNameOrEmail} cho khóa học "${courseTitle}". Vui lòng kiểm tra và xác nhận trong trang quản trị.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào Ban quản trị,</p>
    <p>Học viên <strong>${escapeHtml(studentNameOrEmail)}</strong> vừa đăng ký khóa học <strong>${escapeHtml(courseTitle)}</strong>.</p>
    <p>Vui lòng đăng nhập vào trang quản trị để kiểm tra và xử lý đơn đăng ký.</p>
  </body>
</html>`,
  }
}
