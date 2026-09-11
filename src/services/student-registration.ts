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
import { sendDuplicateAttemptEmail, sendVerifyOtpEmail } from '@/email/send'
import { issueOtp } from '@/services/otp-challenge'

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

  const sendOtp = await applyRegistration(payload, existing, input)

  if (sendOtp) {
    // §5.1 step 6 — issue OTP (after commit)
    const otp = await issueOtp(payload, email)
    // §5.1 step 7 — verification email (after commit, fire-and-forget)
    void sendVerifyOtpEmail(payload, email, otp).catch((err) =>
      payload.logger.error({ err }, 'EMAIL_VERIFY_OTP send failed'),
    )
  }

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
): Promise<boolean> {
  if (!existing) {
    await createStudentWithWelcomeNotification(payload, data)
    return true
  }

  if (existing.status === 'ACTIVE') {
    // never reveal the collision — notify the real owner instead
    void sendDuplicateAttemptEmail(payload, data.email).catch((err) =>
      payload.logger.error({ err }, 'DUPLICATE_REGISTER_ATTEMPT email failed'),
    )
    return false
  }

  if (existing.status === 'PENDING_VERIFICATION') {
    // treat as a resend: refresh credentials, no second notification
    await payload.update({
      collection: 'students',
      id: existing.id,
      data: { password: data.password, fullName: data.fullName, phone: data.phone },
    })
    return true
  }

  // DISABLED — do nothing, just leave a trail
  payload.logger.warn({ email: data.email }, 'registration attempt on a DISABLED account')
  return false
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
        isWalkIn: false,
      },
      req,
    })
    await payload.create({
      collection: 'notifications',
      data: {
        student: student.id,
        type: 'ACCOUNT_CREATED',
        title: 'Có người dùng đăng ký tài khoản mới',
        content: 'Tài khoản của bạn đã được tạo. Hãy xác minh email để bắt đầu.',
        isRead: false,
      },
      req,
    })
    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (err) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw err
  }
}
