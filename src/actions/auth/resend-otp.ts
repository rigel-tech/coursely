'use server'

import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'
import type { ResendOtpState } from '@/lib/constants/resend-otp-state'
import { resendOtp } from '@/services/otp-store'
import { sendVerifyOtpEmail } from '@/email/send'

const SESSION_EXPIRED = 'Phiên xác minh đã hết hạn. Vui lòng đăng ký lại.'
const COOLDOWN = 'Vui lòng đợi ít phút rồi thử lại.'
const GENERIC_ERROR = 'Có lỗi hệ thống. Vui lòng thử lại sau.'

/**
 * Server action for the "Gửi lại mã" control on `<OtpForm>`. Reads the same
 * `pending_email` cookie `verifyOtpAction` trusts, and delegates the cooldown
 * decision to `resendOtp` — never touches account status or the session cookies.
 */
export async function resendOtpAction(
  _prev: ResendOtpState,
  _formData: FormData,
): Promise<ResendOtpState> {
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value
  if (!email) return { status: 'error', message: SESSION_EXPIRED }

  try {
    const payload = await getPayload({ config: await configPromise })
    const result = await resendOtp(payload, email)
    if (!result.ok) return { status: 'cooldown', message: COOLDOWN }

    void sendVerifyOtpEmail(payload, email, result.otp).catch((err) =>
      payload.logger.error({ err }, 'EMAIL_VERIFY_OTP send failed'),
    )
    return { status: 'sent' }
  } catch (err) {
    console.error('resendOtpAction failed', err)
    return { status: 'error', message: GENERIC_ERROR }
  }
}
