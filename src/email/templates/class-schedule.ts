import type { ClassScheduleTemplateInput } from '@/notifications/types'
import { formatDate } from '@/utilities/formatDateTime'
import { escapeHtml } from './escape-html'
import type { EmailBody } from './verify-otp'

const TO_BE_ANNOUNCED = 'Sẽ thông báo sau'

/**
 * The body both class-schedule emails share: being placed in a class and that class being
 * rescheduled differ only in their subject and opening lines. `htmlIntro` is inserted as
 * markup — escape anything typed by a person before passing it.
 */
export function renderClassScheduleEmail(
  {
    studentNameOrEmail,
    courseTitle,
    classCode,
    startDate,
    endDate,
    scheduleTime,
    location,
  }: ClassScheduleTemplateInput,
  copy: { subject: string; textIntro: string; htmlIntro: string; textOutro: string },
): EmailBody {
  const period = `${formatDate(startDate)}${endDate ? ` – ${formatDate(endDate)}` : ''}`

  return {
    subject: copy.subject,
    text: `Chào ${studentNameOrEmail},\n\n${copy.textIntro}\n- Thời gian: ${period}\n- Lịch học: ${scheduleTime || TO_BE_ANNOUNCED}\n- Địa điểm: ${location || TO_BE_ANNOUNCED}\n\n${copy.textOutro}`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào <strong>${escapeHtml(studentNameOrEmail)}</strong>,</p>
    ${copy.htmlIntro}
    <div>
      <p><strong>Khóa học:</strong> ${escapeHtml(courseTitle)}</p>
      <p><strong>Mã lớp:</strong> ${escapeHtml(classCode)}</p>
      <p><strong>Thời gian:</strong> ${escapeHtml(period)}</p>
      ${scheduleTime ? `<p><strong>Lịch học:</strong> ${escapeHtml(scheduleTime)}</p>` : ''}
      ${location ? `<p><strong>Địa điểm:</strong> ${escapeHtml(location)}</p>` : ''}
    </div>
    <p>Vui lòng đăng nhập vào trang tài khoản để theo dõi lộ trình học tập.</p>
  </body>
</html>`,
  }
}
