import type { LoginFieldErrors } from '@/lib/validation/login-schema'

/**
 * Outcome surfaced to `<LoginForm>` via `useActionState`.
 * `AUTH_021` bad credentials · `AUTH_022` unverified (account exists but email
 * not confirmed) · `AUTH_023` Payload lockout · `AUTH_024` account disabled.
 *
 * The action never calls `redirect()` — setting an auth cookie and redirecting in
 * the same server action drops the cookie. On `'success'` (where it sets
 * `coursely-access` / `coursely-refresh`), and on `AUTH_022` (where it sets
 * `pending_email`), it returns `redirectTo` and the client navigates. Lives
 * outside the `'use server'` module because that file may only export async
 * functions.
 */
export type LoginState = {
  status: 'idle' | 'error' | 'success'
  code?: 'AUTH_021' | 'AUTH_022' | 'AUTH_023' | 'AUTH_024'
  message?: string
  fieldErrors?: LoginFieldErrors
  redirectTo?: string
}

export const initialLoginState: LoginState = { status: 'idle' }
