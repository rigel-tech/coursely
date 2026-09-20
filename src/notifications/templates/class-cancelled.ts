export function createStudentClassCancelledNotificationTemplate(
  courseTitle: string,
  classCode: string,
): { title: string; content: string } {
  return {
    title: `Lớp học đã bị hủy: ${classCode}`,
    content: `Lớp học ${classCode} của khóa học "${courseTitle}" đã bị hủy. Ban quản trị sẽ liên hệ sớm để hỗ trợ bạn sắp xếp lớp học thay thế.`,
  }
}
