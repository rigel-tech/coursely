import type { EmailBody } from './verify-otp'

/** Reset password email with a one-time link (US-203). */
export function resetPasswordEmail(resetUrl: string): EmailBody {
  return {
    subject: 'Yêu cầu đặt lại mật khẩu - Coursely',
    text:
      `Chào bạn,\n\n` +
      `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Coursely của bạn.\n` +
      `Vui lòng truy cập liên kết sau để đặt mật khẩu mới:\n${resetUrl}\n\n` +
      `Liên kết này chỉ dùng được một lần. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và mật khẩu của bạn vẫn an toàn.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào bạn,</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại Coursely.</p>
    <p style="margin: 20px 0">
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold">
        Đặt lại mật khẩu
      </a>
    </p>
    <p>
      Hoặc sao chép liên kết này vào trình duyệt:<br/>
      <a href="${resetUrl}">${resetUrl}</a>
    </p>
    <p>
      Liên kết này có thời hạn và chỉ có thể sử dụng <strong>một lần</strong>. Nếu bạn không gửi yêu cầu này, bạn có thể yên tâm bỏ qua email này.
    </p>
  </body>
</html>`,
  }
}
