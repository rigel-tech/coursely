import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { issueOtp } from '@/services/otp-store'
import { redis } from '@/lib/redis'
import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'

/**
 * Server-action context. `next/headers` has no request scope under vitest, so the
 * cookie jar is mocked. A correct OTP does NOT sign the user in any more — it
 * only clears `pending_email` and points at `/dang-nhap?verified=1`.
 */
const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  cookieOptions: new Map<string, unknown>(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
    set: (name: string, value: string, options?: unknown) => {
      ctx.cookieJar.set(name, value)
      ctx.cookieOptions.set(name, options)
    },
    delete: (name: string) => ctx.cookieJar.delete(name),
  }),
}))

const AUTH_COOKIE = 'payload-token'

const { verifyOtpAction } = await import('@/actions/auth/verify-otp')
const { initialVerifyOtpState } = await import('@/lib/constants/verify-otp-state')

let payload: Payload

const usedEmails = new Set<string>()
const uniqueEmail = (tag = 'verify') => {
  const e = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  usedEmails.add(e)
  return e
}

const form = (otp: string) => {
  const fd = new FormData()
  fd.set('otp', otp)
  return fd
}
const run = (fd: FormData) => verifyOtpAction(initialVerifyOtpState, fd)

/** Create a user in `status` and put its email in the pending-email cookie. */
const seed = async (status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'DISABLED', tag?: string) => {
  const email = uniqueEmail(tag)
  const user = await payload.create({
    collection: 'users',
    data: { email, password: 'abcd1234', role: 'STUDENT', status },
  })
  ctx.cookieJar.set(PENDING_EMAIL_COOKIE, email)
  return { email, user }
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

beforeEach(() => {
  ctx.cookieJar.clear()
  ctx.cookieOptions.clear()
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const email of usedEmails) {
    await redis.del(`otp:verify:${email}`, `otp:cooldown:${email}`, `otp:quota:${email}`)
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 10,
      depth: 0,
    })
    for (const u of docs) {
      await payload.delete({ collection: 'notifications', where: { user: { equals: u.id } } })
      await payload.delete({ collection: 'users', id: u.id })
    }
  }
  usedEmails.clear()
})

describe('verifyOtpAction — happy path', () => {
  it('flips the account to ACTIVE, clears the cookie, consumes the code, sets NO auth cookie', async () => {
    const { email, user } = await seed('PENDING_VERIFICATION')
    const { otp } = await issueOtp(email)

    expect(await run(form(otp))).toEqual({ status: 'success', redirectTo: '/dang-nhap?verified=1' })

    const after = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
    expect(after.status).toBe('ACTIVE')
    expect(after.verifiedAt).toBeTruthy()
    expect(ctx.cookieJar.has(PENDING_EMAIL_COOKIE)).toBe(false)
    expect(await redis.exists(`otp:verify:${email}`)).toBe(0)

    // no sign-in happens here
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has('coursely-token')).toBe(false)
  })

  it('is idempotent for an already-ACTIVE account and still sets no auth cookie', async () => {
    await seed('ACTIVE')

    expect(await run(form('123456'))).toEqual({
      status: 'success',
      redirectTo: '/dang-nhap?verified=1',
    })
    expect(ctx.cookieJar.has(PENDING_EMAIL_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has('coursely-token')).toBe(false)
  })
})

describe('verifyOtpAction — rejected input', () => {
  it('errors when there is no pending-email cookie', async () => {
    const result = await run(form('123456'))
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/đăng ký lại/i)
  })

  it('errors on a code that is not six digits, without touching the account or the code', async () => {
    const { email, user } = await seed('PENDING_VERIFICATION')
    await issueOtp(email)

    const result = await run(form('12ab5'))
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/6 chữ số/i)

    const after = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
    expect(after.status).toBe('PENDING_VERIFICATION')
    expect(await redis.hget(`otp:verify:${email}`, 'attempts')).toBe('0')
  })
})

describe('verifyOtpAction — wrong code', () => {
  it('reports the remaining tries and leaves the account pending', async () => {
    const { email, user } = await seed('PENDING_VERIFICATION')
    const { otp } = await issueOtp(email)
    const wrong = String((Number(otp) + 1) % 1_000_000).padStart(6, '0')

    const result = await run(form(wrong))
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/còn 4 lần/i)

    const after = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
    expect(after.status).toBe('PENDING_VERIFICATION')
    expect(await redis.hget(`otp:verify:${email}`, 'attempts')).toBe('1')
  })

  it('rejects a superseded code after a resend, then accepts the fresh one', async () => {
    const { email } = await seed('PENDING_VERIFICATION')
    const first = (await issueOtp(email)).otp
    const second = (await issueOtp(email)).otp

    if (first !== second) {
      const stale = await run(form(first))
      expect(stale.status).toBe('error')
    }

    expect(await run(form(second))).toEqual({
      status: 'success',
      redirectTo: '/dang-nhap?verified=1',
    })
  })
})

describe('verifyOtpAction — disabled account', () => {
  it('refuses without consuming the code', async () => {
    const { email, user } = await seed('DISABLED')
    const { otp } = await issueOtp(email)

    const result = await run(form(otp))
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/khoá/i)

    const after = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
    expect(after.status).toBe('DISABLED')
    expect(await redis.exists(`otp:verify:${email}`)).toBe(1)
  })
})
