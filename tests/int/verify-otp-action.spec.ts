import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { issueOtp } from '@/services/otp-challenge'
import { clearOtp, readOtp } from './helpers/otp-record'
import { PENDING_EMAIL_COOKIE, REMEMBER_ME_MAX_AGE_SEC } from '@/lib/constants/auth'

/**
 * Server-action context. `next/headers` has no request scope under vitest, so the
 * cookie jar and request headers are mocked. A correct OTP now also mints a
 * session, so the jar records cookie options too.
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
  headers: async () => ({
    get: (name: string) =>
      ({ 'x-forwarded-for': '10.1.2.3', 'user-agent': 'vitest-otp' })[name.toLowerCase()] ?? null,
  }),
}))

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

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
    collection: 'students',
    data: { email, password: 'abcd1234', status },
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
    await clearOtp(payload, email)
    const { docs } = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 10,
      depth: 0,
    })
    for (const u of docs) {
      await payload.delete({ collection: 'notifications', where: { student: { equals: u.id } } })
      await payload.delete({ collection: 'students', id: u.id })
    }
  }
  usedEmails.clear()
})

describe('verifyOtpAction — happy path', () => {
  it('flips the account to ACTIVE, signs the user in, clears the cookie, consumes the code', async () => {
    const { email, user } = await seed('PENDING_VERIFICATION')
    const { otp } = await issueOtp(payload, email)

    expect(await run(form(otp))).toEqual({ status: 'success', redirectTo: '/' })

    const after = await payload.findByID({ collection: 'students', id: user.id, depth: 0 })
    expect(after.status).toBe('ACTIVE')
    expect(after.verifiedAt).toBeTruthy()
    expect(ctx.cookieJar.has(PENDING_EMAIL_COOKIE)).toBe(false)
    expect(await readOtp(payload, email)).toBeNull()

    // a fresh session, treated as "remember me" (D10)
    expect(ctx.cookieJar.get(ACCESS_COOKIE)).toBeTruthy()
    expect(ctx.cookieJar.get(REFRESH_COOKIE)).toBeTruthy()
    expect((ctx.cookieOptions.get(REFRESH_COOKIE) as Record<string, unknown>).maxAge).toBe(
      REMEMBER_ME_MAX_AGE_SEC,
    )
  })

  it('is idempotent for an already-ACTIVE account and still issues a session', async () => {
    await seed('ACTIVE')

    expect(await run(form('123456'))).toEqual({ status: 'success', redirectTo: '/' })
    expect(ctx.cookieJar.has(PENDING_EMAIL_COOKIE)).toBe(false)
    expect(ctx.cookieJar.get(ACCESS_COOKIE)).toBeTruthy()
    expect(ctx.cookieJar.get(REFRESH_COOKIE)).toBeTruthy()
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
    await issueOtp(payload, email)

    const result = await run(form('12ab5'))
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/6 chữ số/i)

    const after = await payload.findByID({ collection: 'students', id: user.id, depth: 0 })
    expect(after.status).toBe('PENDING_VERIFICATION')
    expect((await readOtp(payload, email))?.attempts).toBe(0)
  })
})

describe('verifyOtpAction — wrong code', () => {
  it('reports the remaining tries and leaves the account pending', async () => {
    const { email, user } = await seed('PENDING_VERIFICATION')
    const { otp } = await issueOtp(payload, email)
    const wrong = String((Number(otp) + 1) % 1_000_000).padStart(6, '0')

    const result = await run(form(wrong))
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/còn 4 lần/i)

    const after = await payload.findByID({ collection: 'students', id: user.id, depth: 0 })
    expect(after.status).toBe('PENDING_VERIFICATION')
    expect((await readOtp(payload, email))?.attempts).toBe(1)
  })

  it('rejects a superseded code after a resend, then accepts the fresh one', async () => {
    const { email } = await seed('PENDING_VERIFICATION')
    const first = (await issueOtp(payload, email)).otp
    const second = (await issueOtp(payload, email)).otp

    if (first !== second) {
      const stale = await run(form(first))
      expect(stale.status).toBe('error')
    }

    expect(await run(form(second))).toEqual({ status: 'success', redirectTo: '/' })
  })
})

describe('verifyOtpAction — disabled account', () => {
  it('refuses without consuming the code', async () => {
    const { email, user } = await seed('DISABLED')
    const { otp } = await issueOtp(payload, email)

    const result = await run(form(otp))
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/khoá/i)

    const after = await payload.findByID({ collection: 'students', id: user.id, depth: 0 })
    expect(after.status).toBe('DISABLED')
    expect(await readOtp(payload, email)).toBeTruthy()
  })
})
