/**
 * Login domain logic (§7). No HTTP concerns — the caller owns request headers and
 * writes the cookie. This module owns: the two rate-limit axes (per IP, per
 * email), the `payload.login` call and its error mapping, the app-level `status`
 * branch Payload does not know about, and — on success — clearing the email
 * counter, stamping `lastLoginAt`, and the audit-log row. No notification: a
 * login is routine and one per sign-in would flood the bell.
 *
 * On success it returns Payload's own session `token` (and its `exp`) for the
 * caller to set as `coursely-token` — `useSessions` means a `users_sessions` row
 * already backs it. A non-STUDENT is rejected (`AUTH_025`) by the
 * `enforceLoginBoundary` hook; admins use `/admin/login`.
 */
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { LOGIN_EMAIL_LIMIT, LOGIN_IP_LIMIT, LOGIN_RATE_WINDOW_SEC } from '@/lib/constants/auth'
import { bumpRate, clearRate, peekRate } from '@/lib/rate-limit'
import type { LoginInput } from '@/lib/validation/login-schema'
import { sendVerifyOtpEmail } from '@/email/send'
import { resendOtp } from '@/services/otp-store'

export type LoginContext = { ip: string; userAgent: string }

export type LoginServiceResult =
  | {
      ok: true
      user: { id: number; role?: string; status?: string }
      token: string
      exp: number
      redirectTo: string
    }
  | {
      ok: false
      code: 'AUTH_020' | 'AUTH_021' | 'AUTH_023' | 'AUTH_024' | 'AUTH_025'
      message: string
    }
  | { ok: false; code: 'AUTH_022'; message: string; email: string; redirectTo: string }

const IP_RATE_LIMITED = 'Quá nhiều lần thử từ thiết bị này, vui lòng thử lại sau.'
const EMAIL_RATE_LIMITED = 'Tài khoản tạm khóa do đăng nhập sai nhiều lần, thử lại sau 15 phút.'
const BAD_CREDENTIALS = 'Email hoặc mật khẩu không đúng.'
const DISABLED = 'Tài khoản đã bị khóa, vui lòng liên hệ trung tâm.'
const ADMIN_AT_STUDENT_FORM = 'Tài khoản quản trị vui lòng đăng nhập tại trang quản trị.'

const ipKey = (ip: string) => `rate:login:ip:${ip}`
const emailKey = (email: string) => `rate:login:email:${email}`

export async function authenticateUser(
  input: LoginInput,
  { ip, userAgent }: LoginContext,
): Promise<LoginServiceResult> {
  const email = input.email.trim().toLowerCase()

  // §7 — gates read the counters; only a real credential failure bumps them.
  if (!(await peekRate(ipKey(ip), LOGIN_IP_LIMIT)).ok) {
    return { ok: false, code: 'AUTH_020', message: IP_RATE_LIMITED }
  }
  if (!(await peekRate(emailKey(email), LOGIN_EMAIL_LIMIT)).ok) {
    return { ok: false, code: 'AUTH_020', message: EMAIL_RATE_LIMITED }
  }

  const payload = await getPayload({ config: await configPromise })

  let result: Awaited<ReturnType<Payload['login']>>
  try {
    result = await payload.login({
      collection: 'users',
      data: { email, password: input.password },
      // `enforceLoginBoundary` reads this — a non-STUDENT is rejected before the
      // login transaction commits, so no `users_sessions` row survives.
      context: { source: 'student' },
    })
  } catch (err) {
    const name = (err as { name?: string })?.name

    if (name === 'LoginBoundaryError') {
      return { ok: false, code: 'AUTH_025', message: ADMIN_AT_STUDENT_FORM }
    }
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
      await bumpRate(ipKey(ip), LOGIN_RATE_WINDOW_SEC)
      await bumpRate(emailKey(email), LOGIN_RATE_WINDOW_SEC)
      return { ok: false, code: 'AUTH_021', message: BAD_CREDENTIALS }
    }
    throw err
  }

  const user = result.user as { id: number; role?: string; status?: string }

  // §7 — status lives in our schema, Payload never checked it. A `payload.login`
  // that got here already minted a session row; the status rejections below leave
  // it dangling, but it is bounded by `tokenExpiration` and never handed out (no
  // cookie is set), so it is harmless. (Role is already gated by
  // `enforceLoginBoundary` — an ADMIN never reaches this point.)
  if (user.status === 'DISABLED') {
    return { ok: false, code: 'AUTH_024', message: DISABLED }
  }
  if (user.status === 'PENDING_VERIFICATION') {
    // §7 — a returning unverified user needs a working code waiting for them; the
    // one from registration may already be stale. Fire-and-forget, cooldown-gated,
    // same shape as `registerStudent`'s own send.
    const resend = await resendOtp(email)
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

  // §7 success — reset the email counter, stamp the login, leave a trail. The
  // caller sets `result.token` as `payload-token`.
  await clearRate(emailKey(email))
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { lastLoginAt: new Date().toISOString() },
  })
  await payload.create({
    collection: 'audit-logs',
    data: { action: 'LOGIN_SUCCESS', user: user.id, ip, userAgent },
  })

  return {
    ok: true,
    user: { id: user.id, role: user.role, status: user.status },
    token: result.token ?? '',
    exp: result.exp ?? 0,
    redirectTo: input.callbackUrl ?? '/',
  }
}

/** The moment Payload's lockout lifts, read from the hidden `lockUntil` field. */
async function lockUntil(payload: Payload, email: string): Promise<Date | null> {
  const doc = (
    await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
  ).docs[0] as { lockUntil?: string } | undefined
  return doc?.lockUntil ? new Date(doc.lockUntil) : null
}
