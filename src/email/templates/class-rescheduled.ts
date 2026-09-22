import type { ClassScheduleTemplateInput } from '@/notifications/types'
import { renderClassScheduleEmail } from './class-schedule'
import { escapeHtml } from './escape-html'
import type { EmailBody } from './verify-otp'

export function createClassRescheduledEmailTemplate(input: ClassScheduleTemplateInput): EmailBody {
  const { courseTitle, classCode } = input

  return renderClassScheduleEmail(input, {
    subject: `[Coursely] Cập nhật lịch học mới: Lớp ${classCode} - ${courseTitle}`,
    textIntro: `Lớp học ${classCode} của khóa học "${courseTitle}" đã cập nhật lịch học mới:`,
    htmlIntro: `<p>Lớp học <strong>${escapeHtml(classCode)}</strong> của khóa học <strong>${escapeHtml(courseTitle)}</strong> vừa được cập nhật lịch học mới:</p>`,
    textOutro: 'Vui lòng đăng nhập vào tài khoản để theo dõi chi tiết.',
  })
}
