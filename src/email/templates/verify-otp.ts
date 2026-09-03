/** Body shape passed to `payload.sendEmail`. */
export type EmailBody = { subject: string; html: string; text: string }

/** Verification email carrying the 6-digit OTP (§5.1 step 7 — `EMAIL_VERIFY_OTP`). */
export function verifyOtpEmail(otp: string): EmailBody {
  return {
    subject: 'Mã xác minh tài khoản Coursely',
    text:
      `Mã xác minh đăng ký Coursely của bạn là ${otp}. ` +
      `Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào bạn,</p>
    <p>Mã xác minh đăng ký Coursely của bạn là:</p>
    <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0">${otp}</p>
    <p>Mã có hiệu lực trong <strong>5 phút</strong>. Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.</p>
  </body>
</html>`,
  }
}
