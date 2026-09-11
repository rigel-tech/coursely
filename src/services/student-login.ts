/**
 * Login domain logic (§7). No HTTP concerns — the caller owns request headers and
 * writes the cookies. This module owns: the `payload.login` call and its error
 * mapping, the app-level `status` branch Payload does not know about, and — on
 * success — stamping `lastLoginAt`. No notification: a login is routine and one
 * per sign-in would flood the bell.
 *
 * Brute force is Payload's job alone: `maxLoginAttempts` locks the account after
 * five failures and surfaces here as `AUTH_023`. There is no per-IP axis, so one
 * address may keep guessing across many different accounts.
 *
 * This is the **students** door. A `users` row — staff — is not a principal here:
 * `payload.login` on `students` cannot find it, so it is refused with the same
 * `AUTH_021` as an address that does not exist. That is deliberate, and it is also
 * what keeps `session:index:{userId}` free of `users` ids; the two tables have
 * colliding serial ids. Staff sign in at Payload's own `/admin/login`.
 */
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import type { LoginInput } from '@/lib/validation/login-schema'
import { sendVerifyOtpEmail } from '@/email/send'
import { resendOtp } from '@/services/otp-challenge'

export type LoginServiceResult =
  | {
      ok: true
      student: { id: number; status?: string }
      redirectTo: string
    }
  | { ok: false; code: 'AUTH_021' | 'AUTH_023' | 'AUTH_024'; message: string }
  | { ok: false; code: 'AUTH_022'; message: string; email: string; redirectTo: string }

const BAD_CREDENTIALS = 'Email hoặc mật khẩu không đúng.'
const DISABLED = 'Tài khoản đã bị khóa, vui lòng liên hệ trung tâm.'

export async function authenticateStudent(input: LoginInput): Promise<LoginServiceResult> {
  const email = input.email.trim().toLowerCase()

  const payload = await getPayload({ config: await configPromise })

  let result: Awaited<ReturnType<Payload['login']>>
  try {
    result = await payload.login({
      collection: 'students',
      data: { email, password: input.password },
    })
  } catch (err) {
    const name = (err as { name?: string })?.name

    if (name === 'LockedAuth') {
      const unlockAt = await lockUntil(payload, email)
      return {
        ok: false,
        code: 'AUTH_023',
        message: unlockAt
          ? `Tài khoản đang tạm khóa, thử lại sau ${unlockAt.toLocaleString('vi-VN')}.`
          : 'Tài khoản đang tạm khóa, vui lòng thử lại sau.',
      }
    }
    if (name === 'AuthenticationError') {
      // §7 — wrong email and wrong password are reported identically.
      return { ok: false, code: 'AUTH_021', message: BAD_CREDENTIALS }
    }
    throw err
  }

  const student = result.user as { id: number; status?: string }

  // §7 — status lives in our schema, Payload never checked it.
  if (student.status === 'DISABLED') {
    return { ok: false, code: 'AUTH_024', message: DISABLED }
  }
  if (student.status === 'PENDING_VERIFICATION') {
    // §7 — a returning unverified user needs a working code waiting for them; the
    // one from registration may already be stale. Fire-and-forget, cooldown-gated,
    // same shape as `registerStudent`'s own send.
    const resend = await resendOtp(payload, email)
    if (resend.ok) {
      void sendVerifyOtpEmail(payload, email, resend.otp).catch((err) =>
        payload.logger.error({ err }, 'EMAIL_VERIFY_OTP send failed'),
      )
    }
    return {
      ok: false,
      code: 'AUTH_022',
      message: 'Tài khoản chưa xác minh email.',
      email,
      redirectTo: '/xac-thuc-otp',
    }
  }

  // §7 success — stamp the login, leave a trail. The caller mints the session
  // tokens (`payload.login`'s own JWT is discarded).
  await payload.update({
    collection: 'students',
    id: student.id,
    data: { lastLoginAt: new Date().toISOString() },
  })

  return {
    ok: true,
    student: { id: student.id, status: student.status },
    redirectTo: input.callbackUrl ?? '/',
  }
}

/** The moment Payload's lockout lifts, read from the hidden `lockUntil` field. */
async function lockUntil(payload: Payload, email: string): Promise<Date | null> {
  const doc = (
    await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
  ).docs[0] as { lockUntil?: string } | undefined
  return doc?.lockUntil ? new Date(doc.lockUntil) : null
}
