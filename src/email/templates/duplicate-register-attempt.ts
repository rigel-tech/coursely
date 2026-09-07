import type { EmailBody } from './verify-otp'

/**
 * Sent when someone tries to register with an email that already has an ACTIVE
 * account (§5.1 step 4 — `DUPLICATE_REGISTER_ATTEMPT`). The registration flow
 * itself stays silent so the two cases look identical to the visitor.
 */
export function duplicateRegisterAttemptEmail(): EmailBody {
  return {
    subject: 'Có người vừa thử đăng ký bằng email của bạn',
    text:
      'Vừa có một yêu cầu đăng ký tài khoản Coursely bằng địa chỉ email này, ' +
      'nhưng email đã được đăng ký trước đó. Nếu đó là bạn, hãy đăng nhập bình thường ' +
      'hoặc dùng chức năng quên mật khẩu. Nếu không phải bạn, có thể bỏ qua email này.',
    html: `<!doctype html>
<html lang="vi">
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>Chào bạn,</p>
    <p>
      Vừa có một yêu cầu đăng ký tài khoản Coursely bằng địa chỉ email này, nhưng email
      đã được đăng ký trước đó.
    </p>
  </body>
</html>`,
  }
}
