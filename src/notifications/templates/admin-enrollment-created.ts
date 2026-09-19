export function createAdminEnrollmentCreatedNotificationTemplate(
  studentNameOrEmail: string,
  courseTitle: string,
): { title: string; content: string } {
  return {
    title: 'Có đơn đăng ký khóa học mới',
    content: `Học viên ${studentNameOrEmail} vừa đăng ký khóa học "${courseTitle}". Đang chờ xác nhận.`,
  }
}
