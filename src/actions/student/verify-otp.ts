'use server'

import { cookies } from 'next/headers'

import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'
import type { VerifyOtpState } from '@/lib/constants/verify-otp-state'
import { verifyRegistration } from '@/services/student-verification'
import { setSessionCookies } from '@/lib/auth/session-cookies'
import { getVerifyOtpErrorMessage, SESSION_EXPIRED } from '@/lib/errors/auth'

/**
 * Server action for the OTP step (§5.2). Validates the request surface — the
 * `pending_email` cookie and the 6-digit shape — then delegates to
 * `verifyRegistration`. A correct code also signs the user in: it clears
 * `pending_email`, mints a session (treated as "remember me" — the register flow
 * has no such control), sets the `coursely-access` / `coursely-refresh` cookies,
 * and returns `redirectTo` for `<OtpForm>` to navigate. It never calls
 * `redirect()` (see INVARIANTS). Every other outcome is a message.
 */ export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const cookieStore = await cookies()
  const email = cookieStore.get(PENDING_EMAIL_COOKIE)?.value

  if (!email) {
    return {
      status: 'error',
      message: SESSION_EXPIRED,
    }
  }

  const otp = String(formData.get('otp') ?? '').trim()

  if (!/^\d{6}$/.test(otp)) {
    return {
      status: 'error',
      message: 'Mã xác minh gồm 6 chữ số.',
    }
  }

  const result = await verifyRegistration(email, otp)

  if (!result.ok) {
    return {
      status: 'error',
      message: getVerifyOtpErrorMessage(result),
    }
  }

  cookieStore.delete(PENDING_EMAIL_COOKIE)
  await setSessionCookies(cookieStore, result.student)

  return {
    status: 'success',
    redirectTo: '/',
  }
}
