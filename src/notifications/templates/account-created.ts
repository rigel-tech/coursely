/** Copy for the `ACCOUNT_CREATED` notification — mirrors `src/email/templates/`'s shape. */
export function accountCreatedNotification(
  fullName: string | null | undefined,
  email: string,
): { title: string; content: string } {
  return {
    title: 'Có người dùng đăng ký tài khoản mới',
    content: `Học viên ${fullName || email} vừa đăng ký tài khoản mới trên hệ thống.`,
  }
}
