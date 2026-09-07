/**
 * Result of an OTP verification attempt, surfaced to `<OtpForm>` via
 * `useActionState`. Lives outside the `'use server'` module because that file may
 * only export async functions.
 *
 * A successful verification does not sign the user in — the action clears
 * `pending_email` and returns `redirectTo: '/dang-nhap?verified=1'` rather than
 * calling `redirect()` (see INVARIANTS), and `<OtpForm>` navigates from an effect.
 */
export type VerifyOtpState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  redirectTo?: string
}

export const initialVerifyOtpState: VerifyOtpState = { status: 'idle' }
