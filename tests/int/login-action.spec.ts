// @vitest-environment node
// jsdom's Uint8Array is a different realm from jose's `instanceof` check, so
// `payload.login`'s JWT signing throws there. This spec is pure server code.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { redis } from '@/lib/redis'
import { clearOtp, readOtp } from './helpers/otp-record'
import { REMEMBER_ME_MAX_AGE_SEC } from '@/lib/constants/auth'
import { SessionScope } from './helpers/session-keys'

/**
 * Server-action context. `next/headers` has no request scope under vitest, so the
 * cookie jar and request headers are mocked. `loginAction` never redirects — it
 * returns `redirectTo` — so nothing here throws a navigation marker.
 */
const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  cookieOptions: new Map<string, unknown>(),
  reqHeaders: new Map<string, string>(),
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
    get: (name: string) => ctx.reqHeaders.get(name.toLowerCase()) ?? null,
  }),
}))

const { loginAction } = await import('@/actions/auth/login')
const { initialLoginState } = await import('@/lib/constants/login-state')

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

let payload: Payload
let currentIp: string
const scope = new SessionScope()

const rnd = () => Math.floor(Math.random() * 255)
const usedEmails = new Set<string>()
const staffIds = new Set<number>()
const usedIps = new Set<string>()

const uniqueEmail = (tag = 'login') => {
  const e = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  usedEmails.add(e)
  return e
}

const makeUser = async (over: { tag?: string; status?: string; password?: string } = {}) => {
  const email = uniqueEmail(over.tag)
  const password = over.password ?? 'Secret123'
  const user = await payload.create({
    collection: 'students',
    data: { email, password, status: (over.status ?? 'ACTIVE') as 'ACTIVE' },
  })
  scope.user(user.id as number)
  return { email, password, user }
}

/** A staff account. `/dang-nhap` must treat it as an address it has never seen. */
const makeStaff = async (tag = 'staff') => {
  const email = uniqueEmail(tag)
  const password = 'Secret123'
  const user = await payload.create({
    collection: 'users',
    data: { email, password },
  })
  staffIds.add(user.id as number)
  return { email, password, user }
}

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}
const run = (fd: FormData) => loginAction(initialLoginState, fd)

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

beforeEach(() => {
  ctx.cookieJar.clear()
  ctx.cookieOptions.clear()
  ctx.reqHeaders.clear()
  ctx.reqHeaders.set('user-agent', 'vitest-login')
  currentIp = `10.${rnd()}.${rnd()}.${rnd()}`
  usedIps.add(currentIp)
  ctx.reqHeaders.set('x-forwarded-for', currentIp)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await scope.cleanup()
  usedIps.clear()
  for (const email of usedEmails) {
    await clearOtp(payload, email)
    const { docs } = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 10,
      depth: 0,
    })
    for (const u of docs) {
      await payload.delete({ collection: 'notifications', where: { user: { equals: u.id } } })
      await payload.delete({ collection: 'students', id: u.id })
    }
  }
  usedEmails.clear()
  for (const id of staffIds) await payload.delete({ collection: 'users', id }).catch(() => {})
  staffIds.clear()
})

describe('loginAction — success', () => {
  it('ACTIVE user: access+refresh cookies, lastLoginAt stamped, no notification, home', async () => {
    const { email, password, user } = await makeUser()
    expect(
      (await payload.findByID({ collection: 'students', id: user.id, depth: 0 })).lastLoginAt,
    ).toBeFalsy()

    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'success', redirectTo: '/' })

    // no payload-token any more — the student flow has its own cookie pair
    expect(ctx.cookieJar.has('payload-token')).toBe(false)
    expect(ctx.cookieJar.get(ACCESS_COOKIE)).toBeTruthy()
    expect(ctx.cookieJar.get(REFRESH_COOKIE)).toBeTruthy()

    const accessOpts = ctx.cookieOptions.get(ACCESS_COOKIE) as Record<string, unknown>
    expect(accessOpts).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    expect(accessOpts.maxAge).toBeUndefined()

    // no "remember me" → the refresh cookie is a session cookie too
    const refreshOpts = ctx.cookieOptions.get(REFRESH_COOKIE) as Record<string, unknown>
    expect(refreshOpts).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    expect(refreshOpts.maxAge).toBeUndefined()

    expect(
      (await payload.findByID({ collection: 'students', id: user.id, depth: 0 })).lastLoginAt,
    ).toBeTruthy()

    const notes = await payload.find({
      collection: 'notifications',
      where: { user: { equals: user.id } },
      limit: 0,
    })
    expect(notes.totalDocs).toBe(0)
  })

  it('rememberMe extends the refresh cookie to 30 days; the access cookie stays a session cookie', async () => {
    const { email, password } = await makeUser()
    await run(form({ email, password, rememberMe: 'on' }))
    expect((ctx.cookieOptions.get(REFRESH_COOKIE) as Record<string, unknown>).maxAge).toBe(
      REMEMBER_ME_MAX_AGE_SEC,
    )
    expect((ctx.cookieOptions.get(ACCESS_COOKIE) as Record<string, unknown>).maxAge).toBeUndefined()
  })

  it('sends a student to a same-site callbackUrl, else home', async () => {
    const a = await makeUser()
    expect(
      await run(form({ email: a.email, password: a.password, callbackUrl: '/khoa-hoc/abc' })),
    ).toMatchObject({ redirectTo: '/khoa-hoc/abc' })

    const b = await makeUser()
    expect(
      await run(form({ email: b.email, password: b.password, callbackUrl: '//evil.com' })),
    ).toMatchObject({ redirectTo: '/' })
  })
})

describe('loginAction — a staff account is not a principal here', () => {
  it('refuses a users row with its own correct password, exactly like an unknown email', async () => {
    const { email, password } = await makeStaff()

    const res = await run(form({ email, password }))
    expect(res).toMatchObject({
      status: 'error',
      code: 'AUTH_021',
      message: 'Email hoặc mật khẩu không đúng.',
    })

    // No student session may ever be minted for a `users` document: the two tables
    // have colliding serial ids, so one leaking into `session:index:{id}` puts two
    // different accounts on one session line. See INVARIANTS.
    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
    expect(ctx.cookieJar.has(REFRESH_COOKIE)).toBe(false)
    expect(res).not.toHaveProperty('redirectTo')
  })
})

describe('loginAction — bad credentials', () => {
  it('wrong password: AUTH_021, no cookie, and no counter is written', async () => {
    const { email } = await makeUser()
    const res = await run(form({ email, password: 'WrongPass1' }))
    expect(res).toMatchObject({
      status: 'error',
      code: 'AUTH_021',
      message: 'Email hoặc mật khẩu không đúng.',
    })
    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
    // A failed sign-in used to bump two Redis counters. Both axes are gone, so a
    // failure must leave no trace at all behind.
    expect(await redis.exists(`rate:login:ip:${currentIp}`, `rate:login:email:${email}`)).toBe(0)
  })

  it('unknown email is indistinguishable from a wrong password', async () => {
    const res = await run(form({ email: uniqueEmail('ghost'), password: 'Whatever1' }))
    expect(res).toMatchObject({
      status: 'error',
      code: 'AUTH_021',
      message: 'Email hoặc mật khẩu không đúng.',
    })
  })
})

describe('loginAction — no per-IP throttle', () => {
  // The old per-IP axis cut in on the 22nd attempt from one address. Every attempt
  // here uses a different unknown email, so Payload's own per-account lockout —
  // which stays — cannot be what answers.
  // None of these addresses exists, so nothing is created and `usedEmails` — which
  // costs a query per entry to clean — is deliberately left out of it.
  it('22 failed attempts from one IP all come back AUTH_021', async () => {
    const stamp = Date.now()
    for (let i = 0; i < 22; i++) {
      const res = await run(
        form({ email: `burst-${stamp}-${i}@example.com`, password: 'x1234567' }),
      )
      expect(res).toMatchObject({ status: 'error', code: 'AUTH_021' })
    }
  })
})

describe('loginAction — status gate', () => {
  it('DISABLED: AUTH_024, no cookie, lastLoginAt untouched', async () => {
    const { email, password, user } = await makeUser({ status: 'DISABLED' })
    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'error', code: 'AUTH_024' })
    expect(res.message).toMatch(/khóa/)
    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
    expect(
      (await payload.findByID({ collection: 'students', id: user.id, depth: 0 })).lastLoginAt,
    ).toBeFalsy()
  })

  it('PENDING_VERIFICATION: AUTH_022, pending_email set, points at /xac-thuc-otp', async () => {
    const { email, password } = await makeUser({ status: 'PENDING_VERIFICATION' })
    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'error', code: 'AUTH_022', redirectTo: '/xac-thuc-otp' })
    expect(ctx.cookieJar.get('pending_email')).toBe(email)
    expect(ctx.cookieJar.has(ACCESS_COOKIE)).toBe(false)
  })

  it('PENDING_VERIFICATION: issues a fresh OTP and sends the verification email', async () => {
    const { email, password } = await makeUser({ status: 'PENDING_VERIFICATION' })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    await run(form({ email, password }))

    expect(await readOtp(payload, email)).toBeTruthy()
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('PENDING_VERIFICATION: a second login within the resend cooldown sends no second email', async () => {
    const { email, password } = await makeUser({ status: 'PENDING_VERIFICATION' })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    await run(form({ email, password }))
    await run(form({ email, password }))

    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('wrong password against a PENDING_VERIFICATION account never sends a verification email', async () => {
    const { email } = await makeUser({ status: 'PENDING_VERIFICATION' })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    const res = await run(form({ email, password: 'WrongPass1' }))

    expect(res).toMatchObject({ status: 'error', code: 'AUTH_021' })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('loginAction — Payload lockout', () => {
  it('after the account is locked: AUTH_023 carrying the unlock time', async () => {
    const { email, password } = await makeUser()
    for (let i = 0; i < 5; i++) await run(form({ email, password: 'WrongPass1' }))

    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'error', code: 'AUTH_023' })
    expect(res.message).toMatch(/\d/)
  })
})
