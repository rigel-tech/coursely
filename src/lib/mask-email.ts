/**
 * `nguyen@gmail.com` → `ng***@gmail.com`. Shown on the verify-otp screen so the
 * user recognises which inbox to check without the full address being echoed back.
 * A local part of two characters or fewer is masked entirely.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at <= 0) return email

  const local = email.slice(0, at)
  const domain = email.slice(at)

  if (local.length <= 2) return '*'.repeat(local.length) + domain
  return local.slice(0, 2) + '***' + domain
}
