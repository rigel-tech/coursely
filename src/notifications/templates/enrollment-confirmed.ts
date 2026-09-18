export function createStudentEnrollmentConfirmedNotificationTemplate(courseTitle: string): {
  title: string
  content: string
} {
  return {
    title: 'Đơn đăng ký đã được xác nhận',
    content: `Đơn đăng ký khóa học "${courseTitle}" của bạn đã được xác nhận thành công. Chúng tôi sẽ sớm thông báo lịch xếp lớp cụ thể.`,
  }
}
