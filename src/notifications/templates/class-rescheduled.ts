import type { ClassScheduleInfo } from '../types'
import { formatScheduleDetails } from './format-schedule'

export function createStudentClassRescheduledNotificationTemplate(info: ClassScheduleInfo): {
  title: string
  content: string
} {
  return {
    title: `Thay đổi lịch học: ${info.classCode}`,
    content: `Lớp ${info.classCode} của khóa học "${info.courseTitle}" đã cập nhật lịch học mới${formatScheduleDetails(info)}. Vui lòng kiểm tra chi tiết trong tài khoản.`,
  }
}
