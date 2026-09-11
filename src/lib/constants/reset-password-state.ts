/**
 * Outcome surfaced to `<ResetPasswordForm>`. One message, no per-field map — the client
 * already validated through `resetPasswordFormSchema`, so a server-side rejection means
 * either the token (which the form never validates — it isn't a field the person types)
 * or a caller bypassed the form.
 *
 * Lives outside the `'use server'` module because that file may only export async
 * functions.
 */
export type ResetPasswordState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export const initialResetPasswordState: ResetPasswordState = { status: 'idle' }
