import { afterEach, describe, expect, it } from 'vitest'

import { issueOtp, resendOtp, verifyOtp, OTP_MAX_VERIFY_ATTEMPTS } from '@/services/otp-store'
import { verifyOtpHash } from '@/services/otp'
import { redis } from '@/lib/redis'

/** A 6-digit code guaranteed to differ from `otp`. */
const wrongOf = (otp: string) => String((Number(otp) + 1) % 1_000_000).padStart(6, '0')

const emails: string[] = []
const freshEmail = () => {
  const e = `otp-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  emails.push(e)
  return e
}

afterEach(async () => {
  for (const e of emails.splice(0)) {
    await redis.del(`otp:verify:${e}`, `otp:cooldown:${e}`, `otp:quota:${e}`)
  }
})

describe('issueOtp', () => {
  it('stores the HMAC with a ~5 minute TTL, attempts=0, plus cooldown and quota', async () => {
    const email = freshEmail()

    const { otp } = await issueOtp(email)

    const stored = await redis.hgetall(`otp:verify:${email}`)
    expect(stored.hash).toBeTruthy()
    expect(stored.attempts).toBe('0')
    expect(verifyOtpHash(otp, stored.hash)).toBe(true)

    const ttl = await redis.ttl(`otp:verify:${email}`)
    expect(ttl).toBeGreaterThan(280)
    expect(ttl).toBeLessThanOrEqual(300)

    expect(await redis.ttl(`otp:cooldown:${email}`)).toBeGreaterThan(0)
    expect(await redis.get(`otp:quota:${email}`)).toBe('1')
  })

  it('overwrites the previous code so the old one no longer verifies', async () => {
    const email = freshEmail()

    const first = (await issueOtp(email)).otp
    const second = (await issueOtp(email)).otp

    const stored = await redis.hgetall(`otp:verify:${email}`)
    expect(verifyOtpHash(second, stored.hash)).toBe(true)
    if (first !== second) expect(verifyOtpHash(first, stored.hash)).toBe(false)
  })

  it('increments the hourly quota and gives it a TTL', async () => {
    const email = freshEmail()

    await issueOtp(email)
    await issueOtp(email)
    await issueOtp(email)

    expect(await redis.get(`otp:quota:${email}`)).toBe('3')
    expect(await redis.ttl(`otp:quota:${email}`)).toBeGreaterThan(0)
  })
})

describe('resendOtp', () => {
  it('issues a fresh code when no send is on cooldown', async () => {
    const email = freshEmail()

    const result = await resendOtp(email)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    const stored = await redis.hgetall(`otp:verify:${email}`)
    expect(verifyOtpHash(result.otp, stored.hash)).toBe(true)
  })

  it('refuses without touching the live challenge when a send is still on cooldown', async () => {
    const email = freshEmail()
    const { otp: firstOtp } = await issueOtp(email)

    const result = await resendOtp(email)

    expect(result).toEqual({ ok: false, reason: 'cooldown' })
    // The original code must still be the one that verifies — resendOtp did not
    // touch otp:verify:{email} on a cooldown refusal.
    const stored = await redis.hgetall(`otp:verify:${email}`)
    expect(verifyOtpHash(firstOtp, stored.hash)).toBe(true)
  })
})

describe('verifyOtp', () => {
  it('accepts the right code once, then the key is consumed', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(email)

    expect(await verifyOtp(email, otp)).toEqual({ ok: true })
    expect(await redis.exists(`otp:verify:${email}`)).toBe(0)
    expect(await verifyOtp(email, otp)).toEqual({ ok: false, reason: 'expired' })
  })

  it('reports expired when no code was ever issued', async () => {
    expect(await verifyOtp(freshEmail(), '123456')).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects a wrong code, counts the attempt, reports the remaining tries, and keeps the TTL', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(email)

    expect(await verifyOtp(email, wrongOf(otp))).toEqual({
      ok: false,
      reason: 'mismatch',
      remaining: OTP_MAX_VERIFY_ATTEMPTS - 1,
    })
    expect(await redis.hget(`otp:verify:${email}`, 'attempts')).toBe('1')

    const ttl = await redis.ttl(`otp:verify:${email}`)
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(300)
  })

  it('locks out after the 5th wrong attempt and stops counting past it', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(email)
    const wrong = wrongOf(otp)

    for (let i = 1; i < OTP_MAX_VERIFY_ATTEMPTS; i++) {
      expect(await verifyOtp(email, wrong)).toEqual({
        ok: false,
        reason: 'mismatch',
        remaining: OTP_MAX_VERIFY_ATTEMPTS - i,
      })
    }

    expect(await verifyOtp(email, wrong)).toEqual({ ok: false, reason: 'locked' })
    expect(await redis.hget(`otp:verify:${email}`, 'attempts')).toBe(
      String(OTP_MAX_VERIFY_ATTEMPTS),
    )

    // Further calls stay locked without incrementing — the right code no longer helps either.
    expect(await verifyOtp(email, otp)).toEqual({ ok: false, reason: 'locked' })
    expect(await redis.hget(`otp:verify:${email}`, 'attempts')).toBe(
      String(OTP_MAX_VERIFY_ATTEMPTS),
    )
  })
})
