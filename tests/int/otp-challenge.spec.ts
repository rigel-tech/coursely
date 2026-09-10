// The OTP challenge lives in Payload's key–value store, which has no TTL of its own.
// Expiry is therefore a field inside the record and a check on the way out, and the
// only thing that ever removes a stale record is a read that trips over it. That is
// what most of this spec is about — the counting rules were already true on Redis.

import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import {
  issueOtp,
  resendOtp,
  verifyOtp,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_TTL_SEC,
} from '@/services/otp-challenge'
import { verifyOtpHash } from '@/services/otp'

/** The record `otp-challenge` keeps. Written here directly to age a challenge without waiting. */
type OtpRecord = { hash: string; attempts: number; expiresAt: number; nextResendAt: number }

const kvKey = (email: string) => `otp:${email}`
const nowSec = () => Math.floor(Date.now() / 1000)

/** A 6-digit code guaranteed to differ from `otp`. */
const wrongOf = (otp: string) => String((Number(otp) + 1) % 1_000_000).padStart(6, '0')

let payload: Payload

const emails: string[] = []
const freshEmail = () => {
  const e = `otp-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  emails.push(e)
  return e
}

const read = (email: string) => payload.kv.get<OtpRecord>(kvKey(email))

/** Move the record's clock into the past so the next call sees an elapsed window. */
const expire = async (email: string, field: 'expiresAt' | 'nextResendAt') => {
  const record = await read(email)
  if (!record) throw new Error(`no challenge for ${email}`)
  await payload.kv.set(kvKey(email), { ...record, [field]: nowSec() - 1 })
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const e of emails.splice(0)) await payload.kv.delete(kvKey(e))
})

describe('issueOtp', () => {
  it('writes one KV record carrying the hash, a zeroed counter and a ~5 minute expiry', async () => {
    const email = freshEmail()

    const { otp } = await issueOtp(payload, email)

    const record = await read(email)
    expect(record).toBeTruthy()
    expect(verifyOtpHash(otp, record!.hash)).toBe(true)
    expect(record!.attempts).toBe(0)
    expect(record!.expiresAt).toBeGreaterThan(nowSec() + OTP_TTL_SEC - 20)
    expect(record!.expiresAt).toBeLessThanOrEqual(nowSec() + OTP_TTL_SEC)
    expect(record!.nextResendAt).toBeGreaterThan(nowSec())
  })

  it('overwrites the previous code so the old one no longer verifies', async () => {
    const email = freshEmail()

    const first = (await issueOtp(payload, email)).otp
    const second = (await issueOtp(payload, email)).otp

    const record = await read(email)
    expect(verifyOtpHash(second, record!.hash)).toBe(true)
    if (first !== second) expect(verifyOtpHash(first, record!.hash)).toBe(false)
  })

  it('does not cap how many codes one address may be sent', async () => {
    const email = freshEmail()

    for (let i = 0; i < 6; i++) {
      const result = await resendOtp(payload, email)
      expect(result.ok).toBe(true)
      await expire(email, 'nextResendAt')
    }
  })
})

describe('resendOtp', () => {
  it('issues a fresh code when nothing is on cooldown', async () => {
    const email = freshEmail()

    const result = await resendOtp(payload, email)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(verifyOtpHash(result.otp, (await read(email))!.hash)).toBe(true)
  })

  it('refuses inside the cooldown without touching the live challenge', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(payload, email)

    expect(await resendOtp(payload, email)).toEqual({ ok: false, reason: 'cooldown' })
    // The original code must still be the one that verifies.
    expect(verifyOtpHash(otp, (await read(email))!.hash)).toBe(true)
  })

  it('issues again once the cooldown has elapsed, killing the old code', async () => {
    const email = freshEmail()
    const { otp: first } = await issueOtp(payload, email)
    await expire(email, 'nextResendAt')

    const result = await resendOtp(payload, email)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(await verifyOtp(payload, email, first)).toMatchObject({ ok: false })
  })
})

describe('verifyOtp', () => {
  it('accepts the right code once, then the record is consumed', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(payload, email)

    expect(await verifyOtp(payload, email, otp)).toEqual({ ok: true })
    expect(await read(email)).toBeNull()
    expect(await verifyOtp(payload, email, otp)).toEqual({ ok: false, reason: 'expired' })
  })

  it('reports expired when no code was ever issued', async () => {
    expect(await verifyOtp(payload, freshEmail(), '123456')).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  // Nothing else deletes a stale record: the KV store has no TTL, so a read that finds
  // an elapsed `expiresAt` is the whole of the cleanup.
  it('reports expired past `expiresAt` and drops the record on the way out', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(payload, email)
    await expire(email, 'expiresAt')

    expect(await verifyOtp(payload, email, otp)).toEqual({ ok: false, reason: 'expired' })
    expect(await read(email)).toBeNull()
  })

  it('rejects a wrong code, counts the attempt and reports the remaining tries', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(payload, email)

    expect(await verifyOtp(payload, email, wrongOf(otp))).toEqual({
      ok: false,
      reason: 'mismatch',
      remaining: OTP_MAX_VERIFY_ATTEMPTS - 1,
    })
    expect((await read(email))!.attempts).toBe(1)
  })

  it('a wrong guess does not extend the expiry', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(payload, email)
    const before = (await read(email))!.expiresAt

    await verifyOtp(payload, email, wrongOf(otp))

    expect((await read(email))!.expiresAt).toBe(before)
  })

  it('locks out after the 5th wrong attempt and stops counting past it', async () => {
    const email = freshEmail()
    const { otp } = await issueOtp(payload, email)
    const wrong = wrongOf(otp)

    for (let i = 1; i < OTP_MAX_VERIFY_ATTEMPTS; i++) {
      expect(await verifyOtp(payload, email, wrong)).toEqual({
        ok: false,
        reason: 'mismatch',
        remaining: OTP_MAX_VERIFY_ATTEMPTS - i,
      })
    }

    expect(await verifyOtp(payload, email, wrong)).toEqual({ ok: false, reason: 'locked' })
    expect((await read(email))!.attempts).toBe(OTP_MAX_VERIFY_ATTEMPTS)

    // Still locked, and the right code no longer helps either.
    expect(await verifyOtp(payload, email, otp)).toEqual({ ok: false, reason: 'locked' })
    expect((await read(email))!.attempts).toBe(OTP_MAX_VERIFY_ATTEMPTS)
  })
})
