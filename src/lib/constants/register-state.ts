/**
 * Outcome surfaced to `<RegisterForm>`. `field` targets one input's error message
 * (currently only `'email'`, for a duplicate account); when absent, `message` renders as
 * a generic banner instead — the client-validated `registerSchema` rejection and a
 * duplicate email are the only server-side errors reachable through the real form. A
 * system failure is not reported here at all: it leaves the action by `throw` and the
 * form turns it into a banner.
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
  field?: 'email'
}

export const initialRegisterState: RegisterState = { status: 'idle' }
