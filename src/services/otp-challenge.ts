/**
 * The OTP challenge, held in Payload's key–value store (§3.2). What is written
 * down is `HMAC-SHA256(otp, OTP_SECRET)`, never the code itself.
 *
 * One record per address, at `otp:{email}`:
 *
 *   hash          the code, in the only form that is ever persisted
 *   attempts      wrong guesses so far; at five the challenge is dead
 *   expiresAt     epoch seconds — the code stops working once this passes
 *   nextResendAt  epoch seconds — "Gửi lại mã" refuses before this
 *
 * The store has **no TTL**, which is the one thing to keep in mind here: expiry
 * is a field, checked on every read, and a read that trips over an elapsed record
 * deletes it. That read is the whole of the cleanup. A challenge nobody comes back
 * for therefore sits in `payload-kv` until the next code for the same address
 * overwrites it — dead on arrival to every caller, but still a row.
 */
import type { Payload } from 'payload'

import { generateOtp, hashOtp, verifyOtpHash } from '@/services/otp'

export const OTP_TTL_SEC = 300
export const OTP_COOLDOWN_SEC = 60
export const OTP_MAX_VERIFY_ATTEMPTS = 5

type OtpRecord = { hash: string; attempts: number; expiresAt: number; nextResendAt: number }

const key = (email: string) => `otp:${email}`
const nowSec = () => Math.floor(Date.now() / 1000)

/** The challenge for `email` if one is still live; an expired record is dropped here. */
async function readLive(payload: Payload, email: string): Promise<OtpRecord | null> {
  const record = await payload.kv.get<OtpRecord>(key(email))
  if (!record) return null

  if (record.expiresAt <= nowSec()) {
    await payload.kv.delete(key(email))
    return null
  }
  return record
}

export type ResendResult = { ok: true; otp: string } | { ok: false; reason: 'cooldown' }

/**
 * Mint a fresh code for `email`, replacing any prior one — the old code stops
 * working immediately and both windows restart. Returns the plaintext for the
 * caller to put in the email; it is never stored.
 */
export async function issueOtp(payload: Payload, email: string): Promise<string> {
  const otp = generateOtp()
  const now = nowSec()

  await payload.kv.set(key(email), {
    hash: hashOtp(otp),
    attempts: 0,
    expiresAt: now + OTP_TTL_SEC,
    nextResendAt: now + OTP_COOLDOWN_SEC,
  })

  return otp
}

/**
 * `issueOtp`, but refuses instead of sending twice inside the resend cooldown.
 * Shared by every path that can re-send a code outside a fresh registration (a
 * login bounce, the verification screen's "resend" control) so none of them can
 * drift from the cooldown's semantics.
 */
export async function resendOtp(payload: Payload, email: string): Promise<ResendResult> {
  const live = await readLive(payload, email)
  if (live && nowSec() < live.nextResendAt) return { ok: false, reason: 'cooldown' }

  const otp = await issueOtp(payload, email)
  return { ok: true, otp }
}

/** Outcome of a single `verifyOtp` call. `remaining` is only present on a mismatch. */
export type OtpVerification =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'locked' }
  | { ok: false; reason: 'mismatch'; remaining: number }

export async function verifyOtp(
  payload: Payload,
  email: string,
  otp: string,
): Promise<OtpVerification> {
  const pendingOtp = await readLive(payload, email)

  if (!pendingOtp) {
    return {
      ok: false,
      reason: 'expired',
    }
  }

  if (pendingOtp.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      reason: 'locked',
    }
  }

  const isOtpValid = verifyOtpHash(otp, pendingOtp.hash)

  if (isOtpValid) {
    await payload.kv.delete(key(email))

    return {
      ok: true,
    }
  }

  const updatedAttempts = pendingOtp.attempts + 1

  await payload.kv.set(key(email), {
    ...pendingOtp,
    attempts: updatedAttempts,
  })

  const remainingAttempts = OTP_MAX_VERIFY_ATTEMPTS - updatedAttempts

  if (remainingAttempts > 0) {
    return {
      ok: false,
      reason: 'mismatch',
      remaining: remainingAttempts,
    }
  }

  return {
    ok: false,
    reason: 'locked',
  }
}
