/**
 * Registration domain logic (§5.1 steps 3–7). No HTTP concerns here — the caller
 * owns the `pending_email` cookie and the redirect. This module owns: email
 * normalisation, the branch on any existing account, the student +
 * welcome-notification transaction, and issuing / emailing the OTP after that
 * transaction commits.
 *
 * Nothing about the request is recorded. The IP and user agent used to be written onto
 * the welcome notification; registering an account never read them back, so they were
 * data kept for its own sake.
 *
 * Nothing caps how often one address may register. What stands between this and a
 * flood of accounts is the OTP: an unverified student is `PENDING_VERIFICATION`
 * and cannot sign in, and the resend cooldown bounds the mail that leaves.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import configPromise from '@payload-config'

import type { Student } from '@/payload-types'
import type { RegisterInput } from '@/lib/validation/register-schema'
import { sendDuplicateAttemptEmail } from '@/email/send'
import { createNotification } from '@/notifications/create'
import { accountCreatedNotification } from '@/notifications/templates/account-created'
import { sendVerificationOtp, type VerificationOtpMode } from '@/services/student-verification-otp'

/**
 * Runs a self-registration attempt. Returns the normalised email for the caller's
 * cookie. Throws on an unexpected failure — the student/notification write is
 * rolled back before it propagates.
 */
export async function registerStudent(input: RegisterInput): Promise<string> {
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

  const otpMode = await applyRegistration(payload, existing, input)

  if (otpMode) await sendVerificationOtp(payload, email, otpMode)

  return email
}

/**
 * §5.1 step 4 — what this attempt does depends on whether `email` already has an
 * account, and if so, its `status`. Each case returns early with whether to (re)send an
 * OTP, so `existing` narrows from `Student | undefined` to `Student` the normal way
 * TypeScript does it, without a cast.
 */
async function applyRegistration(
  payload: Payload,
  existing: Student | undefined,
  data: RegisterInput,
): Promise<VerificationOtpMode | null> {
  if (!existing) {
    await createStudentWithWelcomeNotification(payload, data)
    return 'initial'
  }

  if (existing.status === 'ACTIVE') {
    // never reveal the collision — notify the real owner instead
    void sendDuplicateAttemptEmail(payload, data.email).catch((err) =>
      payload.logger.error({ err }, 'DUPLICATE_REGISTER_ATTEMPT email failed'),
    )
    return null
  }

  if (existing.status === 'PENDING_VERIFICATION') {
    // treat as a resend: refresh credentials, no second notification
    await payload.update({
      collection: 'students',
      id: existing.id,
      data: { password: data.password, fullName: data.fullName, phone: data.phone },
    })
    return 'resend'
  }

  // DISABLED — do nothing, just leave a trail
  payload.logger.warn({ email: data.email }, 'registration attempt on a DISABLED account')
  return null
}

/** §5.1 step 5 — student + welcome notification, atomically. */
async function createStudentWithWelcomeNotification(
  payload: Payload,
  data: RegisterInput,
): Promise<void> {
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }
  try {
    const student = await payload.create({
      collection: 'students',
      data: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        status: 'PENDING_VERIFICATION',
      },
      req,
    })
    const { title, content } = accountCreatedNotification(student.fullName, student.email)
    await createNotification(payload, { type: 'ACCOUNT_CREATED', title, content }, req)
    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (err) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw err
  }
}
