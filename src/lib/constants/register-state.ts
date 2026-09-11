/**
 * Outcome surfaced to `<RegisterForm>`. Two fields, because that is all the form renders:
 * a banner (`message`) and a navigation (`status === 'success'`). No `code` and no
 * per-field map — the client already validated through `registerSchema`, so a server-side
 * rejection means a caller bypassed the form, and that caller has no UI to show field-level
 * detail in anyway. A system failure is not reported here at all: it leaves the action by
 * `throw` and the form turns it into a banner.
 *
 * On `'success'` the `pending_email` cookie is set and `<RegisterForm>` navigates to
 * `/xac-thuc-otp` — the action does not redirect itself, so the cookie is already in the
 * browser before that navigation reads it.
 *
 * Lives outside the `'use server'` module because that file may only export async
 * functions.
 */
export type RegisterState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export const initialRegisterState: RegisterState = { status: 'idle' }
