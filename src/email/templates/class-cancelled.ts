import type { ClassCancelledTemplateInput } from '@/notifications/types'
import { escapeHtml } from './escape-html'
import type { EmailBody } from './verify-otp'

export function createClassCancelledEmailTemplate({
  studentNameOrEmail,
  courseTitle,
  classCode,
}: ClassCancelledTemplateInput): EmailBody {
  return {
    subject: `[Coursely] Thông báo hủy lớp học: ${classCode} - ${courseTitle}`,
    text: `Chào ${studentNameOrEmail},\n\nCoursely xin thông báo lớp học ${classCode} của khóa học "${courseTitle}" đã bị hủy.\n\nBan quản trị sẽ liên hệ sớm nhất để hỗ trợ bạn chuyển sang lớp học khác hoặc hỗ trợ hoàn phí.\n\nThành thật xin lỗi bạn vì sự bất tiện này!`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào <strong>${escapeHtml(studentNameOrEmail)}</strong>,</p>
    <p>Coursely xin thông báo lớp học <strong>${escapeHtml(classCode)}</strong> của khóa học <strong>${escapeHtml(courseTitle)}</strong> đã bị hủy.</p>
    <p>Ban quản trị sẽ liên hệ sớm nhất để hỗ trợ bạn chuyển sang lớp học khác hoặc hỗ trợ hoàn phí.</p>
    <p>Thành thật xin lỗi bạn vì sự bất tiện này!</p>
  </body>
</html>`,
  }
}
