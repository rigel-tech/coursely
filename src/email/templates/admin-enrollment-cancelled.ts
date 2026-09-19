import type { EmailBody } from './verify-otp'

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function createAdminEnrollmentCancelledEmailTemplate(
  studentNameOrEmail: string,
  courseTitle: string,
): EmailBody {
  return {
    subject: `[Admin] Học viên hủy đăng ký: ${courseTitle} | Coursely`,
    text: `Học viên ${studentNameOrEmail} đã hủy đơn đăng ký khóa học "${courseTitle}". Vui lòng kiểm tra trong trang quản trị.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào Ban quản trị,</p>
    <p>Học viên <strong>${escapeHtml(studentNameOrEmail)}</strong> đã hủy đơn đăng ký khóa học <strong>${escapeHtml(courseTitle)}</strong>.</p>
    <p>Vui lòng đăng nhập vào trang quản trị để kiểm tra.</p>
  </body>
</html>`,
  }
}
