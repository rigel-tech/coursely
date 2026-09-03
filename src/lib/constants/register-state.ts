import type { RegisterFieldErrors } from '@/lib/validation/register-schema'

/**
 * Outcome surfaced to `<RegisterForm>` via `useActionState`.
 * `AUTH_001` invalid input (400) · `AUTH_002` rate limited (429) · `AUTH_003` system error (500).
 * On `'success'` the `pending_email` cookie is set and `<RegisterForm>` navigates
 * to `/verify-otp` — the action does not redirect itself, so the cookie is
 * already in the browser before that navigation reads it.
 *
 * Lives outside the `'use server'` module because that file may only export async
 * functions.
 */
export type RegisterState = {
  status: 'idle' | 'error' | 'success'
  code?: 'AUTH_001' | 'AUTH_002' | 'AUTH_003'
  message?: string
  fieldErrors?: RegisterFieldErrors
}

export const initialRegisterState: RegisterState = { status: 'idle' }
