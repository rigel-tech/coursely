/**
 * Outcome surfaced to `<LoginForm>`. Three fields, because three is all the form
 * renders: a banner (`message`) and a navigation (`redirectTo`).
 *
 * There is no error `code` and no per-field map. The AUTH_02x codes still exist
 * where they do work — `AuthResult` in `services/student-login.ts`, which is how the
 * action tells the "unverified" case apart — but nothing downstream of the action
 * ever read them. Field-level messages are the client's job now: the form validates
 * against `loginSchema` before it calls, so the server's own field errors could
 * only be reached by a caller that has no UI to show them in.
 *
 * The action never calls `redirect()` — setting an auth cookie and redirecting in
 * the same server action drops the cookie — so it returns `redirectTo` and the
 * client navigates. Lives outside the `'use server'` module because that file may
 * only export async functions.
 */
export type LoginState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  redirectTo?: string
}

export const initialLoginState: LoginState = { status: 'idle' }
