/**
 * Result of a manual "resend code" click on `<OtpForm>`, surfaced via
 * `useActionState`. Lives outside the `'use server'` module because that file may
 * only export async functions — same split as `VerifyOtpState`.
 */
export type ResendOtpState = {
  status: 'idle' | 'sent' | 'cooldown' | 'error'
  message?: string
}

export const initialResendOtpState: ResendOtpState = { status: 'idle' }
