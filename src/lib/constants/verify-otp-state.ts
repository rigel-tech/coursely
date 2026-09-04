/**
 * Result of an OTP verification attempt, surfaced to `<OtpForm>` via
 * `useActionState`. Lives outside the `'use server'` module because that file may
 * only export async functions.
 *
 * A successful verification also signs the user in — the action sets the
 * `coursely-access` / `coursely-refresh` cookies and returns `redirectTo` rather
 * than calling `redirect()` (see INVARIANTS), and `<OtpForm>` navigates from an
 * effect so the fresh cookies reach the destination.
 */
export type VerifyOtpState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  redirectTo?: string
}

export const initialVerifyOtpState: VerifyOtpState = { status: 'idle' }
