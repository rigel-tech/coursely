/** Copy for the `ENROLLMENT_CANCELLED` notification — mirrors `enrollment-created.ts`'s shape. */
export function createStudentEnrollmentCancelledNotificationTemplate(courseTitle: string): {
  title: string
  content: string
} {
  return {
    title: 'Đã hủy đăng ký khóa học',
    content: `Đơn đăng ký khóa học "${courseTitle}" của bạn đã được hủy thành công.`,
  }
}
