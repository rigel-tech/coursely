/**
 * Login domain logic (§7). No HTTP concerns — the caller owns request headers and
 * writes the cookies. This module owns: the `payload.login` call, the app-level `status`
 * branch Payload does not know about, and — on success — stamping `lastLoginAt`. No
 * notification: a login is routine and one per sign-in would flood the bell.
 *
 * Every refusal leaves by `throw`, never as a return value, and everything thrown is an
 * `APIError`: Payload's own `AuthenticationError` when Payload is the one refusing, and
 * `LoginRefused` / `EmailNotVerified` from `@/lib/errors/auth` when this app is. Those two
 * live over there, not here, because the action that catches them must be able to name
 * them without importing this module and everything it loads.
 *
 * Brute force is Payload's job alone: `maxLoginAttempts` locks the account after five
 * failures and arrives here as `LockedAuth`. There is no per-IP axis, so one address may
 * keep guessing across many different accounts.
 *
 * This is the **students** door. A `users` row — staff — is not a principal here:
 * `payload.login` on `students` cannot find it, so it is refused with the same
 * `AuthenticationError` as an address that does not exist. That is deliberate, and it is
 * also what keeps the session cookies free of `users` ids; the two tables have colliding
 * serial ids. Staff sign in at Payload's own `/admin/login`.
 */
import { LockedAuth, getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import type { LoginInput } from '@/lib/validation/login-schema'
import { EmailNotVerified, LoginRefused } from '@/lib/errors/auth'
import { sendVerificationOtp } from '@/services/student-verification-otp'

/** Who signed in. Deliberately not `Student` — the caller only mints a token from this. */
export type AuthenticatedStudent = { id: number; status: string }

const DISABLED = 'Tài khoản đã bị khóa, vui lòng liên hệ trung tâm.'

export async function authenticateStudent(
  input: LoginInput,
): Promise<{ student: AuthenticatedStudent; redirectTo: string }> {
  const email = input.email.trim().toLowerCase()
  const payload = await getPayload({ config: await configPromise })

  const student = await signIn(payload, input)

  // §7 — `status` lives in our schema, so Payload never looked at it.
  if (student.status === 'DISABLED') throw new LoginRefused(DISABLED)

  if (student.status === 'PENDING_VERIFICATION') {
    await sendVerificationOtp(payload, email, 'resend')
    throw new EmailNotVerified(email)
  }

  // §7 success — stamp the login, leave a trail. The caller mints the session tokens
  // (`payload.login`'s own JWT is discarded).
  await payload.update({
    collection: 'students',
    id: student.id,
    data: { lastLoginAt: new Date().toISOString() },
  })

  return { student, redirectTo: input.callbackUrl ?? '/' }
}

/**
 * `payload.login`, with only the lockout translated. `AuthenticationError` is rethrown
 * untouched: §7 wants a wrong address and a wrong password reported identically, and
 * Payload already gives both the same error.
 */
async function signIn(payload: Payload, data: LoginInput): Promise<AuthenticatedStudent> {
  try {
    const { user } = await payload.login({
      collection: 'students',
      data: { email: data.email, password: data.password },
    })
    return { id: user!.id, status: user!.status }
  } catch (err) {
    // Payload's own lockout copy is English and says nothing about when the lock lifts.
    if (err instanceof LockedAuth) {
      throw new LoginRefused(lockedMessage(await lockUntil(payload, data.email)))
    }
    throw err
  }
}

const lockedMessage = (unlockAt: Date | null): string =>
  unlockAt
    ? `Tài khoản đang tạm khóa, thử lại sau ${unlockAt.toLocaleString('vi-VN')}.`
    : 'Tài khoản đang tạm khóa, vui lòng thử lại sau.'

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
  ).docs[0]

  return doc?.lockUntil ? new Date(doc.lockUntil) : null
}
