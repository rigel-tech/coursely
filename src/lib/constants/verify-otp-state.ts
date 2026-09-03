/**
 * Result of an OTP verification attempt, surfaced to `<OtpForm>` via
 * `useActionState`. Lives outside the `'use server'` module because that file may
 * only export async functions.
 */
export type VerifyOtpState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export const initialVerifyOtpState: VerifyOtpState = { status: 'idle' }
