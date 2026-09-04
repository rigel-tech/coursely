/**
 * OTP primitives (§3.2). Pure crypto — no Redis, no I/O.
 *
 * The plaintext code never leaves this process except in the verification
 * email: what gets stored is `HMAC-SHA256(otp, OTP_SECRET)`, so a Redis dump
 * alone does not reveal any code.
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

/** Six digits from a CSPRNG, left-padded so leading zeros are kept. Never `Math.random`. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** `HMAC-SHA256(otp, OTP_SECRET)` as hex — the only form of the code that is persisted. */
export function hashOtp(otp: string): string {
  return createHmac('sha256', process.env.OTP_SECRET).update(otp).digest('hex')
}

/** Constant-time comparison of `otp` against a stored hex digest. Never throws. */
export function verifyOtpHash(otp: string, storedHex: string): boolean {
  const candidate = Buffer.from(hashOtp(otp), 'hex')
  let stored: Buffer
  try {
    stored = Buffer.from(storedHex, 'hex')
  } catch {
    return false
  }
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}
