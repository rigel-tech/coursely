'use server'

import { cookies, headers } from 'next/headers'

import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'
import type { VerifyOtpState } from '@/lib/constants/verify-otp-state'
import { verifyRegistration } from '@/services/verify-registration'
import { createSession } from '@/services/session-store'
import { setSessionCookies } from '@/lib/auth/session-cookies'

const SESSION_EXPIRED = 'Phiên xác minh đã hết hạn. Vui lòng đăng ký lại.'

/**
 * Server action for the OTP step (§5.2). Validates the request surface — the
 * `pending_email` cookie and the 6-digit shape — then delegates to
 * `verifyRegistration`. A correct code also signs the user in: it clears
 * `pending_email`, mints a session (treated as "remember me" — the register flow
 * has no such control), sets the `coursely-access` / `coursely-refresh` cookies,
 * and returns `redirectTo` for `<OtpForm>` to navigate. It never calls
 * `redirect()` (see INVARIANTS). Every other outcome is a message.
 */
export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value
  if (!email) return { status: 'error', message: SESSION_EXPIRED }

  const otp = String(formData.get('otp') ?? '').trim()
  if (!/^\d{6}$/.test(otp)) return { status: 'error', message: 'Mã xác minh gồm 6 chữ số.' }

  let result
  try {
    result = await verifyRegistration(email, otp)
  } catch (err) {
    console.error('verifyOtpAction failed', err)
    return { status: 'error', message: 'Có lỗi hệ thống. Vui lòng thử lại sau.' }
  }

  if (!result.ok) {
    switch (result.reason) {
      case 'session_expired':
        return { status: 'error', message: SESSION_EXPIRED }
      case 'disabled':
        return { status: 'error', message: 'Tài khoản này đã bị khoá.' }
      case 'expired':
        return { status: 'error', message: 'Mã đã hết hạn. Bấm "Gửi lại mã" để nhận mã mới.' }
      case 'locked':
        return {
          status: 'error',
          message: 'Bạn đã nhập sai quá nhiều lần. Bấm "Gửi lại mã" để nhận mã mới.',
        }
      case 'mismatch':
        return { status: 'error', message: `Mã không đúng. Bạn còn ${result.remaining} lần thử.` }
    }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  const userAgent = h.get('user-agent') || 'unknown'

  const issued = await createSession(result.user, { ip, userAgent }, { rememberMe: true })
  const jar = await cookies()
  jar.delete(PENDING_EMAIL_COOKIE)
  setSessionCookies(jar, issued)

  return { status: 'success', redirectTo: '/' }
}
