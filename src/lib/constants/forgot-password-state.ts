/**
 * Outcome surfaced to `<ForgotPasswordForm>`. One message, no per-field map — the client
 * already validated through `forgotPasswordSchema`, so a server-side rejection means a
 * caller bypassed the form.
 *
 * `'success'` carries the same message whether or not the address has an account; the
 * anti-enumeration guarantee lives in that constancy, not in this type.
 *
 * Lives outside the `'use server'` module because that file may only export async
 * functions.
 */
export type ForgotPasswordState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export const initialForgotPasswordState: ForgotPasswordState = { status: 'idle' }
