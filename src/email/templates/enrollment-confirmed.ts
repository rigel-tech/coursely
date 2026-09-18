export function createEnrollmentConfirmedEmailTemplate(courseTitle: string): {
  subject: string
  html: string
  text: string
} {
  const subject = `[Coursely] Đơn đăng ký khóa học ${courseTitle} đã được xác nhận`
  const text = `Xin chào,\n\nĐơn đăng ký khóa học "${courseTitle}" của bạn đã được xác nhận thành công!\n\nChúng tôi sẽ sớm gửi thông báo khi lớp học của bạn được xếp lịch.\n\nTrân trọng,\nĐội ngũ Coursely`
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #10b981;">Đơn đăng ký đã được xác nhận!</h2>
      <p>Xin chào,</p>
      <p>Đơn đăng ký khóa học <strong>${courseTitle}</strong> của bạn đã được xác nhận thành công.</p>
      <p>Bước tiếp theo: Ban quản trị sẽ tiến hành xếp lớp và thông báo lịch học chi tiết tới bạn qua email và thông báo trên website.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">Coursely — Nền tảng đào tạo chuyên nghiệp</p>
    </div>
  `
  return { subject, html, text }
}
