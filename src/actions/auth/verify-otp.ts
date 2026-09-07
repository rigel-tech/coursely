'use server'

import { cookies } from 'next/headers'

import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'
import type { VerifyOtpState } from '@/lib/constants/verify-otp-state'
import { verifyRegistration } from '@/services/verify-registration'

const SESSION_EXPIRED = 'Phiên xác minh đã hết hạn. Vui lòng đăng ký lại.'

/**
 * Server action for the OTP step (§5.2). Validates the request surface — the
 * `pending_email` cookie and the 6-digit shape — then delegates to
 * `verifyRegistration`. A correct code does NOT sign the user in — the OTP step
 * has no password, so there is nothing to hand `payload.login`. It clears
 * `pending_email` and returns `redirectTo: '/dang-nhap?verified=1'` for
 * `<OtpForm>` to navigate; `/dang-nhap` shows a "verified, please sign in"
 * notice. It never calls `redirect()` (see INVARIANTS). Every other outcome is a
 * message.
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

  ;(await cookies()).delete(PENDING_EMAIL_COOKIE)

  return { status: 'success', redirectTo: '/dang-nhap?verified=1' }
}
