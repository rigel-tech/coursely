import type { ClassScheduleTemplateInput } from '@/notifications/types'
import { renderClassScheduleEmail } from './class-schedule'
import type { EmailBody } from './verify-otp'

export function createClassAssignedEmailTemplate(input: ClassScheduleTemplateInput): EmailBody {
  const { courseTitle, classCode } = input

  return renderClassScheduleEmail(input, {
    subject: `[Coursely] Thông báo xếp lớp: ${courseTitle} - Lớp ${classCode}`,
    textIntro: `Bạn đã được xếp vào lớp ${classCode} của khóa học "${courseTitle}".`,
    htmlIntro: '<p>Bạn đã được xếp vào lớp học thành công tại Coursely!</p>',
    textOutro: 'Vui lòng đăng nhập vào tài khoản để xem chi tiết lịch học.',
  })
}
