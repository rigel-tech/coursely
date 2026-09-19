/** Copy in-app thông báo Admin khi học viên hủy đơn */
export function createAdminEnrollmentCancelledNotificationTemplate(
  studentNameOrEmail: string,
  courseTitle: string,
): { title: string; content: string } {
  return {
    title: 'Học viên đã hủy đơn đăng ký',
    content: `Học viên ${studentNameOrEmail} đã hủy đơn đăng ký khóa học "${courseTitle}".`,
  }
}
