import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { clearOtp, readOtp } from './helpers/otp-record'
import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'

/**
 * Server-action context. `next/headers` has no request scope under vitest, so the
 * cookie jar is mocked — same shape as `verify-otp-action.spec.ts`.
 */
const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => ctx.cookieJar.set(name, value),
    delete: (name: string) => ctx.cookieJar.delete(name),
  }),
}))

const { resendOtpAction } = await import('@/actions/student/resend-otp')
const { initialResendOtpState } = await import('@/lib/constants/resend-otp-state')

let payload: Payload

const usedEmails = new Set<string>()
const uniqueEmail = (tag = 'resend') => {
  const e = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  usedEmails.add(e)
  return e
}

const run = () => resendOtpAction(initialResendOtpState, new FormData())

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

beforeEach(() => {
  ctx.cookieJar.clear()
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const email of usedEmails) {
    await clearOtp(payload, email)
  }
  usedEmails.clear()
})

describe('resendOtpAction', () => {
  it('issues a fresh OTP and emails it when there is no active cooldown', async () => {
    const email = uniqueEmail()
    ctx.cookieJar.set(PENDING_EMAIL_COOKIE, email)
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    const result = await run()

    expect(result.status).toBe('sent')
    expect(await readOtp(payload, email)).toBeTruthy()
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('refuses and sends nothing when a code was already sent in the last 60s', async () => {
    const email = uniqueEmail()
    ctx.cookieJar.set(PENDING_EMAIL_COOKIE, email)
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    await run()
    const result = await run()

    expect(result.status).toBe('cooldown')
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})
