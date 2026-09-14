/** Copy for the `ENROLLMENT_CREATED` notification — mirrors `src/email/templates/`'s shape. */
export function enrollmentCreatedNotification(courseTitle: string): {
  title: string
  content: string
} {
  return {
    title: 'Đăng ký khóa học thành công',
    content: `Bạn đã đăng ký khóa học "${courseTitle}" thành công. Đơn đăng ký đang chờ trung tâm xác nhận.`,
  }
}
