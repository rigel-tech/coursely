/**
 * Registration domain logic (§5.1 steps 3–7). No HTTP concerns here — the caller
 * owns the `pending_email` cookie and the redirect. This module owns: email
 * normalisation, the branch on any existing account, creating the student, firing
 * the account-created notification once that write succeeds, and issuing / emailing
 * the OTP after.
 *
 * Nothing about the request is recorded. The IP and user agent used to be written onto
 * the welcome notification; registering an account never read them back, so they were
 * data kept for its own sake.
 *
 * Nothing caps how often one address may register. What stands between this and a
 * flood of accounts is the OTP: an unverified student is `PENDING_VERIFICATION`
 * and cannot sign in, and the resend cooldown bounds the mail that leaves.
 */
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import type { Student } from '@/payload-types'
import type { RegisterInput } from '@/lib/validation/register-schema'
import { sendDuplicateAttemptEmail } from '@/email/send'
import { createStaffNotification } from '@/notifications/create'
import { createStudentRegisteredNotificationTemplate } from '@/notifications/templates/account-created'
import { sendVerificationOtp, type VerificationOtpMode } from '@/services/student-verification-otp'

export type RegisterResult = { ok: true; email: string } | { ok: false; reason: 'duplicate-email' }

/**
 * Runs a self-registration attempt. On success returns the normalised email for the
 * caller's cookie. Throws on an unexpected failure from creating the student; the welcome
 * notification is never the cause, since it only fires after that write succeeds (see
 * `notifyAccountCreated`).
 */
export async function registerStudent(input: RegisterInput): Promise<RegisterResult> {
  // §5.1 step 3 — normalise
  const email = input.email.trim().toLowerCase()
  const payload = await getPayload({ config: await configPromise })

  // §5.1 step 4 — branch on any existing account
  const existing = (
    await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
  ).docs[0]

  const outcome = await applyRegistration(payload, existing, input)

  if (outcome.kind === 'duplicate') return { ok: false, reason: 'duplicate-email' }
  if (outcome.kind === 'otp') await sendVerificationOtp(payload, email, outcome.mode)

  return { ok: true, email }
}

type ApplyRegistrationOutcome =
  { kind: 'otp'; mode: VerificationOtpMode } | { kind: 'duplicate' } | { kind: 'noop' }

/**
 * §5.1 step 4 — what this attempt does depends on whether `email` already has an
 * account, and if so, its `status`. Each case returns early with the outcome, so
 * `existing` narrows from `Student | undefined` to `Student` the normal way TypeScript
 * does it, without a cast.
 */
async function applyRegistration(
  payload: Payload,
  existing: Student | undefined,
  data: RegisterInput,
): Promise<ApplyRegistrationOutcome> {
  if (!existing) {
    await createStudentAccount(payload, data)
    return { kind: 'otp', mode: 'initial' }
  }

  if (existing.status === 'ACTIVE') {
    // reported to the submitter as a taken email — notify the real owner too
    void sendDuplicateAttemptEmail(payload, data.email).catch((err) =>
      payload.logger.error({ err }, 'DUPLICATE_REGISTER_ATTEMPT email failed'),
    )
    return { kind: 'duplicate' }
  }

  if (existing.status === 'PENDING_VERIFICATION') {
    // treat as a resend: refresh credentials, no second notification
    await payload.update({
      collection: 'students',
      id: existing.id,
      data: { password: data.password, fullName: data.fullName, phone: data.phone },
    })
    return { kind: 'otp', mode: 'resend' }
  }

  // DISABLED — do nothing, just leave a trail
  payload.logger.warn({ email: data.email }, 'registration attempt on a DISABLED account')
  return { kind: 'noop' }
}

/** §5.1 step 5 — creates the student. The welcome notification is a consequence of this,
 * not a condition for it — see `notifyAccountCreated` below. */
async function createStudentAccount(payload: Payload, data: RegisterInput): Promise<void> {
  const student = await payload.create({
    collection: 'students',
    data: {
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone,
      status: 'PENDING_VERIFICATION',
    },
  })

  notifyAccountCreated(payload, student)
}

/**
 * Fired after the student is created, never as part of that write — a notification is a
 * consequence of the new account, not a condition for it. Staff-facing and broadcast
 * (specs/011): self-registration has no staff actor to assign it to.
 */
function notifyAccountCreated(
  payload: Payload,
  student: Pick<Student, 'fullName' | 'email'>,
): void {
  const { title, content } = createStudentRegisteredNotificationTemplate(
    student.fullName,
    student.email,
  )
  void createStaffNotification(payload, { type: 'ACCOUNT_CREATED', title, content }).catch((err) =>
    payload.logger.error({ err }, 'ACCOUNT_CREATED notification failed'),
  )
}
