/**
 * Registration domain logic (§5.1 steps 3–7). No HTTP concerns here — the caller
 * owns request headers, the `pending_email` cookie and the redirect. This module
 * owns: the per-IP rate check, email normalisation, the branch on any existing
 * account, the user + welcome-notification transaction, and issuing / emailing
 * the OTP after that transaction commits.
 */
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import configPromise from '@payload-config'

import { REGISTER_RATE_LIMIT, REGISTER_RATE_WINDOW_SEC } from '@/lib/constants/auth'
import { checkRate } from '@/lib/rate-limit'
import type { RegisterInput } from '@/lib/validation/register-schema'
import { sendDuplicateAttemptEmail, sendVerifyOtpEmail } from '@/email/send'
import { issueOtp } from '@/services/otp-store'

export type RegisterContext = { ip: string; userAgent: string }

export type RegisterServiceResult =
  { ok: true; email: string } | { ok: false; reason: 'rate_limited' }

/**
 * Runs a self-registration attempt. Returns the normalised email on success (for
 * the caller's cookie); `{ ok: false, reason: 'rate_limited' }` when the IP is
 * over quota. Throws on an unexpected failure — the user/notification write is
 * rolled back before it propagates.
 */
export async function registerStudent(
  input: RegisterInput,
  { ip, userAgent }: RegisterContext,
): Promise<RegisterServiceResult> {
  // §5.1 step 1 — rate limit per IP
  const rate = await checkRate(
    `rate:action:register:${ip}`,
    REGISTER_RATE_LIMIT,
    REGISTER_RATE_WINDOW_SEC,
  )
  if (!rate.ok) return { ok: false, reason: 'rate_limited' }

  // §5.1 step 3 — normalise
  const email = input.email.trim().toLowerCase()
  const { password, fullName, phone } = input

  const payload = await getPayload({ config: await configPromise })

  // §5.1 step 4 — branch on any existing account
  const existing = (
    await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
  ).docs[0]

  let sendOtp = false

  if (!existing) {
    await createUserWithWelcomeNotification(payload, {
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
      collection: 'users',
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
    const { otp } = await issueOtp(email)
    // §5.1 step 7 — verification email (after commit, fire-and-forget)
    void sendVerifyOtpEmail(payload, email, otp).catch((err) =>
      payload.logger.error({ err }, 'EMAIL_VERIFY_OTP send failed'),
    )
  }

  return { ok: true, email }
}

/** §5.1 step 5 — user + welcome notification, atomically. */
async function createUserWithWelcomeNotification(
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
    const user = await payload.create({
      collection: 'users',
      data: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        role: 'STUDENT',
        status: 'PENDING_VERIFICATION',
        isWalkIn: false,
      },
      req,
    })
    await payload.create({
      collection: 'notifications',
      data: {
        user: user.id,
        type: 'ACCOUNT_CREATED',
        title: 'Có người dùng mới đăng ký',
        content: 'Một người dùng mới vừa đăng ký tài khoản trên hệ thống.',
        metadata: {
          ip: data.ip,
          userAgent: data.userAgent,
        },
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
