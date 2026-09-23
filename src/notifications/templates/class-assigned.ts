import type { ClassScheduleInfo } from '../types'
import { formatScheduleDetails } from './format-schedule'

export function createStudentClassAssignedNotificationTemplate(info: ClassScheduleInfo): {
  title: string
  content: string
} {
  return {
    title: `Đã xếp lớp: ${info.courseTitle}`,
    content: `Bạn đã được xếp vào lớp ${info.classCode} của khóa học "${info.courseTitle}"${formatScheduleDetails(info)}. Vui lòng kiểm tra chi tiết trong tài khoản.`,
  }
}
