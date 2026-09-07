// @vitest-environment node
// jsdom's Uint8Array is a different realm from jose's `instanceof` check, so
// `payload.login`'s JWT signing throws there. This spec is pure server code.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { redis } from '@/lib/redis'
import { SESSION_TTL_SEC } from '@/lib/constants/auth'

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

const AUTH_COOKIE = 'coursely-token'

let payload: Payload
let currentIp: string

const rnd = () => Math.floor(Math.random() * 255)
const usedEmails = new Set<string>()
const usedIps = new Set<string>()

const uniqueEmail = (tag = 'login') => {
  const e = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  usedEmails.add(e)
  return e
}

const makeUser = async (
  over: { tag?: string; role?: 'ADMIN' | 'STUDENT'; status?: string; password?: string } = {},
) => {
  const email = uniqueEmail(over.tag)
  const password = over.password ?? 'Secret123'
  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password,
      role: over.role ?? 'STUDENT',
      status: (over.status ?? 'ACTIVE') as 'ACTIVE',
    },
  })
  return { email, password, user }
}

const sessionCount = async (id: number | string) =>
  (
    (await payload.findByID({ collection: 'users', id, depth: 0, showHiddenFields: true })) as {
      sessions?: unknown[]
    }
  ).sessions?.length ?? 0

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
  for (const ip of usedIps) await redis.del(`rate:login:ip:${ip}`)
  usedIps.clear()
  for (const email of usedEmails) {
    await redis.del(
      `rate:login:email:${email}`,
      `otp:verify:${email}`,
      `otp:cooldown:${email}`,
      `otp:quota:${email}`,
    )
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 10,
      depth: 0,
    })
    for (const u of docs) {
      await payload.delete({ collection: 'notifications', where: { user: { equals: u.id } } })
      await payload.delete({ collection: 'audit-logs', where: { user: { equals: u.id } } })
      await payload.delete({ collection: 'users', id: u.id })
    }
  }
  usedEmails.clear()
})

describe('loginAction — success', () => {
  it('ACTIVE user: coursely-token cookie, session row, lastLoginAt stamped, one audit row, no notification, home', async () => {
    const { email, password, user } = await makeUser()
    expect(
      (await payload.findByID({ collection: 'users', id: user.id, depth: 0 })).lastLoginAt,
    ).toBeFalsy()

    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'success', redirectTo: '/' })

    // Student session cookie only — never the admin `payload-token`, nor the old pair.
    expect(ctx.cookieJar.get(AUTH_COOKIE)).toBeTruthy()
    expect(ctx.cookieJar.has('payload-token')).toBe(false)
    expect(ctx.cookieJar.has('coursely-access')).toBe(false)
    expect(ctx.cookieJar.has('coursely-refresh')).toBe(false)

    const opts = ctx.cookieOptions.get(AUTH_COOKIE) as Record<string, unknown>
    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SEC,
    })

    // useSessions is on → a users_sessions row now backs the token.
    expect(await sessionCount(user.id)).toBe(1)

    expect(
      (await payload.findByID({ collection: 'users', id: user.id, depth: 0 })).lastLoginAt,
    ).toBeTruthy()

    const notes = await payload.find({
      collection: 'notifications',
      where: { user: { equals: user.id } },
      limit: 0,
    })
    expect(notes.totalDocs).toBe(0)

    const audit = await payload.find({
      collection: 'audit-logs',
      where: { user: { equals: user.id } },
      depth: 0,
    })
    expect(audit.totalDocs).toBe(1)
    expect(audit.docs[0]).toMatchObject({
      action: 'LOGIN_SUCCESS',
      ip: currentIp,
      userAgent: 'vitest-login',
    })
  })

  it('ignores a rememberMe field if one is still submitted', async () => {
    const { email, password } = await makeUser()
    const res = await run(form({ email, password, rememberMe: 'on' }))
    expect(res).toMatchObject({ status: 'success' })
    expect((ctx.cookieOptions.get(AUTH_COOKIE) as Record<string, unknown>).maxAge).toBe(
      SESSION_TTL_SEC,
    )
  })

  it('sends a STUDENT to a same-site callbackUrl, else home', async () => {
    const a = await makeUser()
    expect(
      await run(form({ email: a.email, password: a.password, callbackUrl: '/khoa-hoc/abc' })),
    ).toMatchObject({ redirectTo: '/khoa-hoc/abc' })

    const b = await makeUser()
    expect(
      await run(form({ email: b.email, password: b.password, callbackUrl: '//evil.com' })),
    ).toMatchObject({ redirectTo: '/' })
  })

  it('clears the per-email rate counter on success', async () => {
    const { email, password } = await makeUser()
    await redis.set(`rate:login:email:${email}`, '3')
    await run(form({ email, password }))
    expect(await redis.exists(`rate:login:email:${email}`)).toBe(0)
  })
})

describe('loginAction — bad credentials', () => {
  it('wrong password: AUTH_021, bumps both counters, no cookie', async () => {
    const { email } = await makeUser()
    const res = await run(form({ email, password: 'WrongPass1' }))
    expect(res).toMatchObject({
      status: 'error',
      code: 'AUTH_021',
      message: 'Email hoặc mật khẩu không đúng.',
    })
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)
    expect(await redis.get(`rate:login:ip:${currentIp}`)).toBe('1')
    expect(await redis.get(`rate:login:email:${email}`)).toBe('1')
  })

  it('unknown email is indistinguishable from a wrong password', async () => {
    const missing = uniqueEmail('ghost')
    const res = await run(form({ email: missing, password: 'Whatever1' }))
    expect(res).toMatchObject({
      status: 'error',
      code: 'AUTH_021',
      message: 'Email hoặc mật khẩu không đúng.',
    })
    expect(await redis.get(`rate:login:email:${missing}`)).toBe('1')
  })
})

describe('loginAction — rate limited', () => {
  it('per-email over the limit: AUTH_020, payload.login never runs', async () => {
    const { email, password } = await makeUser()
    await redis.set(`rate:login:email:${email}`, '6')
    const spy = vi.spyOn(payload, 'login')

    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'error', code: 'AUTH_020' })
    expect(res.message).toMatch(/15 phút/)
    expect(spy).not.toHaveBeenCalled()
  })

  it('per-IP over the limit: AUTH_020, payload.login never runs', async () => {
    const { email, password } = await makeUser()
    await redis.set(`rate:login:ip:${currentIp}`, '21')
    const spy = vi.spyOn(payload, 'login')

    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'error', code: 'AUTH_020' })
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('loginAction — role boundary', () => {
  it('an ADMIN account on the student form: AUTH_025, no cookie, no session row', async () => {
    const { email, password, user } = await makeUser({ role: 'ADMIN' })
    const res = await run(form({ email, password }))

    expect(res).toMatchObject({ status: 'error', code: 'AUTH_025' })
    expect(res.message).toMatch(/quản trị/)
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)
    // enforceLoginBoundary throws inside the login transaction → rollback.
    expect(await sessionCount(user.id)).toBe(0)
  })
})

describe('loginAction — status gate', () => {
  it('DISABLED: AUTH_024, no cookie, lastLoginAt untouched', async () => {
    const { email, password, user } = await makeUser({ status: 'DISABLED' })
    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'error', code: 'AUTH_024' })
    expect(res.message).toMatch(/khóa/)
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)
    expect(
      (await payload.findByID({ collection: 'users', id: user.id, depth: 0 })).lastLoginAt,
    ).toBeFalsy()
  })

  it('PENDING_VERIFICATION: AUTH_022, pending_email set, points at /xac-thuc-otp', async () => {
    const { email, password } = await makeUser({ status: 'PENDING_VERIFICATION' })
    const res = await run(form({ email, password }))
    expect(res).toMatchObject({ status: 'error', code: 'AUTH_022', redirectTo: '/xac-thuc-otp' })
    expect(ctx.cookieJar.get('pending_email')).toBe(email)
    expect(ctx.cookieJar.has(AUTH_COOKIE)).toBe(false)
  })

  it('PENDING_VERIFICATION: issues a fresh OTP and sends the verification email', async () => {
    const { email, password } = await makeUser({ status: 'PENDING_VERIFICATION' })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    await run(form({ email, password }))

    expect(await redis.exists(`otp:verify:${email}`)).toBe(1)
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
