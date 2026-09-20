import { formatDate } from '@/utilities/formatDateTime'
import type { ClassAssignedTemplateInput } from '@/notifications/types'
import type { EmailBody } from './verify-otp'

export type { ClassAssignedTemplateInput }

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function createClassAssignedEmailTemplate({
  studentNameOrEmail,
  courseTitle,
  classCode,
  startDate,
  endDate,
  scheduleTime,
  location,
}: ClassAssignedTemplateInput): EmailBody {
  const formattedDate = startDate
    ? `${formatDate(startDate)}${endDate ? ` – ${formatDate(endDate)}` : ''}`
    : 'Sẽ thông báo sau'

  return {
    subject: `[Coursely] Thông báo xếp lớp: ${courseTitle} - Lớp ${classCode}`,
    text: `Chào ${studentNameOrEmail},\n\nBạn đã được xếp vào lớp ${classCode} của khóa học "${courseTitle}".\n- Thời gian: ${formattedDate}\n- Lịch học: ${scheduleTime || 'Sẽ thông báo sau'}\n- Địa điểm: ${location || 'Sẽ thông báo sau'}\n\nVui lòng đăng nhập vào tài khoản để xem chi tiết lịch học.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào <strong>${escapeHtml(studentNameOrEmail)}</strong>,</p>
    <p>Bạn đã được xếp vào lớp học thành công tại Coursely!</p>
    <div>
      <p><strong>Khóa học:</strong> ${escapeHtml(courseTitle)}</p>
      <p><strong>Mã lớp:</strong> ${escapeHtml(classCode)}</p>
      <p><strong>Thời gian:</strong> ${escapeHtml(formattedDate)}</p>
      ${scheduleTime ? `<p><strong>Lịch học:</strong> ${escapeHtml(scheduleTime)}</p>` : ''}
      ${location ? `<p><strong>Địa điểm:</strong> ${escapeHtml(location)}</p>` : ''}
    </div>
    <p>Vui lòng đăng nhập vào trang tài khoản để theo dõi lộ trình học tập.</p>
  </body>
</html>`,
  }
}
