'use server'

/**
 * Result of a registration attempt, surfaced to the form through `useActionState`.
 * `fieldErrors` keys map to form control names so each input can highlight itself.
 */
export type RegisterState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: Partial<Record<'email' | 'password' | 'confirmPassword' | 'terms', string>>
}

export const initialRegisterState: RegisterState = { status: 'idle' }

/**
 * Placeholder registration action. The real flow — rate limiting, Zod validation,
 * the user/notification transaction, OTP issue and the verification email — lands
 * in a follow-up. For now the form is wired end to end but does nothing.
 */
export async function registerAction(
  _prev: RegisterState,
  _formData: FormData,
): Promise<RegisterState> {
  return { status: 'error', message: 'Chức năng đăng ký chưa được triển khai.' }
}
