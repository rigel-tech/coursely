/**
 * Registration domain logic (§5.1 steps 3–7). No HTTP concerns here — the caller
 * owns request headers, the `pending_email` cookie and the redirect. This module
 * owns: email normalisation, the branch on any existing account, the student +
 * welcome-notification transaction, and issuing / emailing the OTP after that
 * transaction commits.
 *
 * Nothing caps how often one address may register. What stands between this and a
 * flood of accounts is the OTP: an unverified student is `PENDING_VERIFICATION`
 * and cannot sign in, and the resend cooldown bounds the mail that leaves.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import configPromise from '@payload-config'

import type { RegisterInput } from '@/lib/validation/register-schema'
import { sendDuplicateAttemptEmail, sendVerifyOtpEmail } from '@/email/send'
import { issueOtp } from '@/services/otp-store'

export type RegisterContext = { ip: string; userAgent: string }

export type RegisterServiceResult = { email: string }

/**
 * Runs a self-registration attempt. Returns the normalised email for the caller's
 * cookie. Throws on an unexpected failure — the student/notification write is
 * rolled back before it propagates.
 */
export async function registerStudent(
  input: RegisterInput,
  { ip, userAgent }: RegisterContext,
): Promise<RegisterServiceResult> {
  // §5.1 step 3 — normalise
  const email = input.email.trim().toLowerCase()
  const { password, fullName, phone } = input

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

  let sendOtp = false

  if (!existing) {
    await createStudentWithWelcomeNotification(payload, {
      email,
      password,
      fullName,
      phone,
      ip,
      userAgent,
    })
    sendOtp = true
  } else if (existing.status === 'ACTIVE') {
    // never reveal the collision — notify the real owner instead
    void sendDuplicateAttemptEmail(payload, email).catch((err) =>
      payload.logger.error({ err }, 'DUPLICATE_REGISTER_ATTEMPT email failed'),
    )
  } else if (existing.status === 'PENDING_VERIFICATION') {
    // treat as a resend: refresh credentials, no second notification
    await payload.update({
      collection: 'students',
      id: existing.id,
      data: { password, fullName, phone },
    })
    sendOtp = true
  } else {
    // DISABLED — do nothing, just leave a trail
    payload.logger.warn({ email }, 'registration attempt on a DISABLED account')
  }

  if (sendOtp) {
    // §5.1 step 6 — issue OTP (after commit)
    const { otp } = await issueOtp(payload, email)
    // §5.1 step 7 — verification email (after commit, fire-and-forget)
    void sendVerifyOtpEmail(payload, email, otp).catch((err) =>
      payload.logger.error({ err }, 'EMAIL_VERIFY_OTP send failed'),
    )
  }

  return { email }
}

/** §5.1 step 5 — student + welcome notification, atomically. */
async function createStudentWithWelcomeNotification(
  payload: Payload,
  data: {
    email: string
    password: string
    fullName?: string
    phone?: string
    ip: string
    userAgent: string
  },
): Promise<void> {
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req = { transactionID } as PayloadRequest
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
        user: student.id,
        type: 'ACCOUNT_CREATED',
        title: 'Chào mừng bạn đến với Coursely',
        content: 'Tài khoản của bạn đã được tạo. Hãy xác minh email để bắt đầu.',
        metadata: { ip: data.ip, userAgent: data.userAgent },
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
