/**
 * Redis-side of the OTP flow (§3.2). Holds only `HMAC-SHA256(otp, OTP_SECRET)`,
 * never the code itself.
 *
 * Keys per email:
 *   otp:verify:{email}    hash { hash, attempts }, TTL 300s  — the live challenge
 *   otp:cooldown:{email}  TTL 60s                            — resend cooldown
 *   otp:quota:{email}     counter, TTL 3600s                 — max 5 sends / hour
 */
import { redis } from '@/lib/redis'
import { generateOtp, hashOtp, verifyOtpHash } from '@/services/otp'

export const OTP_TTL_SEC = 300
export const OTP_COOLDOWN_SEC = 60
export const OTP_QUOTA_WINDOW_SEC = 3600
export const OTP_MAX_SENDS_PER_WINDOW = 5
export const OTP_MAX_VERIFY_ATTEMPTS = 5

const verifyKey = (email: string) => `otp:verify:${email}`
const cooldownKey = (email: string) => `otp:cooldown:${email}`
const quotaKey = (email: string) => `otp:quota:${email}`

export type IssuedOtp = { otp: string }

export type ResendResult = { ok: true; otp: string } | { ok: false; reason: 'cooldown' }

/**
 * Mint a fresh code for `email`: replace any prior code (the old one stops
 * working immediately), (re)start the 5-minute expiry, arm the 60-second resend
 * cooldown, and bump the hourly send quota. Returns the plaintext for the caller
 * to put in the email — it is never stored.
 */
export async function issueOtp(email: string): Promise<IssuedOtp> {
  const otp = generateOtp()
  const key = verifyKey(email)

  await redis
    .multi()
    .del(key)
    .hset(key, { hash: hashOtp(otp), attempts: 0 })
    .expire(key, OTP_TTL_SEC)
    .set(cooldownKey(email), '1', 'EX', OTP_COOLDOWN_SEC)
    .incr(quotaKey(email))
    // NX: only the first send in the window sets the TTL, so the quota window is
    // fixed from that first send rather than sliding on every resend.
    .expire(quotaKey(email), OTP_QUOTA_WINDOW_SEC, 'NX')
    .exec()

  return { otp }
}

/**
 * `issueOtp`, but refuses instead of sending twice inside the resend cooldown.
 * Shared by every path that can re-send a code outside of a fresh registration
 * (a login bounce, the verification screen's "resend" control) so none of them can
 * drift from the cooldown key's own semantics.
 */
export async function resendOtp(email: string): Promise<ResendResult> {
  if (await redis.exists(cooldownKey(email))) return { ok: false, reason: 'cooldown' }
  const { otp } = await issueOtp(email)
  return { ok: true, otp }
}

/** Outcome of a single `verifyOtp` call. `remaining` is only present on a mismatch. */
export type OtpVerification =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'locked' }
  | { ok: false; reason: 'mismatch'; remaining: number }

/**
 * Check `otp` against the live challenge for `email`.
 *
 * `expired` — no challenge (never issued, or the 5-minute TTL lapsed).
 * `locked` — `OTP_MAX_VERIFY_ATTEMPTS` wrong tries already spent; the code is
 * dead even if the next guess is right, the caller must re-issue.
 * `mismatch` — wrong guess, now counted; `remaining` tries left.
 * `ok` — correct, and the challenge is deleted so it cannot be replayed.
 *
 * `HINCRBY` leaves the key's TTL untouched, so a wrong guess never extends the
 * window. Read-then-increment is not atomic, but the flow is single-user and the
 * worst case is one extra try — not worth a Lua script.
 */
export async function verifyOtp(email: string, otp: string): Promise<OtpVerification> {
  const key = verifyKey(email)
  const stored = await redis.hgetall(key)

  if (!stored.hash) return { ok: false, reason: 'expired' }
  if (Number(stored.attempts ?? 0) >= OTP_MAX_VERIFY_ATTEMPTS)
    return { ok: false, reason: 'locked' }

  if (verifyOtpHash(otp, stored.hash)) {
    await redis.del(key)
    return { ok: true }
  }

  const attempts = await redis.hincrby(key, 'attempts', 1)
  const remaining = OTP_MAX_VERIFY_ATTEMPTS - attempts
  return remaining > 0
    ? { ok: false, reason: 'mismatch', remaining }
    : { ok: false, reason: 'locked' }
}
