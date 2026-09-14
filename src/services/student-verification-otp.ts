import type { Payload } from 'payload'

import { sendVerifyOtpEmail } from '@/email/send'
import { issueOtp, resendOtp } from '@/services/otp-challenge'

export type VerificationOtpMode = 'initial' | 'resend'
export type VerificationOtpResult = { ok: true } | { ok: false; reason: 'cooldown' }

/** Issues and emails a verification code, optionally respecting the resend cooldown. */
export async function sendVerificationOtp(
  payload: Payload,
  email: string,
  mode: VerificationOtpMode,
): Promise<VerificationOtpResult> {
  const result =
    mode === 'initial'
      ? { ok: true as const, otp: await issueOtp(payload, email) }
      : await resendOtp(payload, email)

  if (!result.ok) return result

  void sendVerifyOtpEmail(payload, email, result.otp).catch((err) =>
    payload.logger.error({ err }, 'EMAIL_VERIFY_OTP send failed'),
  )

  return { ok: true }
}
