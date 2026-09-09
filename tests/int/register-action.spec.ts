import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { redis } from '@/lib/redis'

/**
 * Server-action context. `next/headers` has no request scope under vitest, so it
 * is mocked: cookies land in `ctx.cookieJar`, request headers are read from
 * `ctx.reqHeaders`. The happy path resolves to `{ status: 'success' }` — the
 * client owns the navigation to `/xac-thuc-otp`, so nothing here throws.
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

// Imported after the mocks are registered.
const { registerAction } = await import('@/actions/auth/register')
const { initialRegisterState } = await import('@/lib/constants/register-state')

let payload: Payload

const usedEmails = new Set<string>()
const uniqueEmail = (tag = 'reg') => {
  const e = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  usedEmails.add(e)
  return e
}

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const validForm = (email: string, over: Record<string, string> = {}) =>
  form({
    email,
    password: 'abcd1234',
    confirmPassword: 'abcd1234',
    fullName: 'Người Test',
    phone: '0900000000',
    terms: 'on',
    ...over,
  })

const run = (fd: FormData) => registerAction(initialRegisterState, fd)

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

beforeEach(() => {
  ctx.cookieJar.clear()
  ctx.cookieOptions.clear()
  ctx.reqHeaders.clear()
  ctx.reqHeaders.set('user-agent', 'vitest-agent')
  ctx.reqHeaders.set(
    'x-forwarded-for',
    `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  )
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const email of usedEmails) {
    await redis.del(`otp:verify:${email}`, `otp:cooldown:${email}`, `otp:quota:${email}`)
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
})

describe('registerAction — new email', () => {
  it('creates the user + welcome notification, issues an OTP, sets the cookie and returns success', async () => {
    const email = uniqueEmail()
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    expect(await run(validForm(email))).toEqual({ status: 'success' })

    const { docs } = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      depth: 0,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0].status).toBe('PENDING_VERIFICATION')

    // The whole point of the split: registration writes to `students` and leaves
    // `users` — the staff table — untouched.
    const staff = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 0,
    })
    expect(staff.totalDocs).toBe(0)

    const notes = await payload.find({
      collection: 'notifications',
      where: { user: { equals: docs[0].id } },
      depth: 0,
    })
    expect(notes.docs).toHaveLength(1)
    expect(notes.docs[0].type).toBe('ACCOUNT_CREATED')

    expect(await redis.exists(`otp:verify:${email}`)).toBe(1)
    expect(ctx.cookieJar.get('pending_email')).toBe(email)
    expect(ctx.cookieOptions.get('pending_email')).toMatchObject({ httpOnly: true })
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('registerAction — existing ACTIVE email', () => {
  it('does not reveal the collision: no new user, duplicate-attempt email, still cookie + success', async () => {
    const email = uniqueEmail('active')
    await payload.create({
      collection: 'students',
      data: { email, password: 'abcd1234', status: 'ACTIVE' },
    })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    expect(await run(validForm(email))).toEqual({ status: 'success' })

    const { totalDocs } = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 0,
    })
    expect(totalDocs).toBe(1)
    expect(await redis.exists(`otp:verify:${email}`)).toBe(0)
    expect(ctx.cookieJar.get('pending_email')).toBe(email)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('registerAction — existing PENDING_VERIFICATION email', () => {
  it('updates credentials, issues a fresh OTP, and does not add a second notification', async () => {
    const email = uniqueEmail('pending')
    const existing = await payload.create({
      collection: 'students',
      data: { email, password: 'oldpass123', status: 'PENDING_VERIFICATION' },
    })
    const before = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      showHiddenFields: true,
      depth: 0,
    })
    const oldHash = (before.docs[0] as { hash?: string }).hash
    vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    expect(await run(validForm(email))).toEqual({ status: 'success' })

    const notes = await payload.find({
      collection: 'notifications',
      where: { user: { equals: existing.id } },
      limit: 0,
    })
    expect(notes.totalDocs).toBe(0)
    expect(await redis.exists(`otp:verify:${email}`)).toBe(1)

    // Credentials were refreshed: the stored hash changed.
    const after = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      showHiddenFields: true,
      depth: 0,
    })
    expect((after.docs[0] as { hash?: string }).hash).toBeTruthy()
    expect((after.docs[0] as { hash?: string }).hash).not.toBe(oldHash)
  })
})

describe('registerAction — DISABLED email', () => {
  it('does nothing but still sets the cookie and returns success', async () => {
    const email = uniqueEmail('disabled')
    await payload.create({
      collection: 'students',
      data: { email, password: 'abcd1234', status: 'DISABLED' },
    })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    expect(await run(validForm(email))).toEqual({ status: 'success' })

    expect(await redis.exists(`otp:verify:${email}`)).toBe(0)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(ctx.cookieJar.get('pending_email')).toBe(email)
  })
})

describe('registerAction — transaction atomicity', () => {
  it('rolls the user back when the notification write fails', async () => {
    const email = uniqueEmail('rollback')
    const realCreate = payload.create.bind(payload)
    vi.spyOn(payload, 'create').mockImplementation(
      async (args: Parameters<typeof payload.create>[0]) => {
        if (args.collection === 'notifications') throw new Error('boom')
        return realCreate(args)
      },
    )

    const result = await run(validForm(email))
    expect(result.code).toBe('AUTH_003')

    vi.restoreAllMocks()
    const { totalDocs } = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 0,
    })
    expect(totalDocs).toBe(0)
  })
})

describe('registerAction — guards', () => {
  it('returns AUTH_001 with fieldErrors on invalid input and writes nothing', async () => {
    const email = uniqueEmail('invalid')
    const result = await run(validForm(email, { email: 'nope', confirmPassword: 'mismatch99' }))

    expect(result.code).toBe('AUTH_001')
    expect(result.fieldErrors).toBeTruthy()
    const { totalDocs } = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 0,
    })
    expect(totalDocs).toBe(0)
  })

  it('returns AUTH_002 once the per-IP limit is exceeded', async () => {
    const ip = `172.16.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    ctx.reqHeaders.set('x-forwarded-for', ip)
    vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    let lastCode: string | undefined
    for (let i = 0; i < 12; i++) {
      const email = uniqueEmail(`rate${i}`)
      const res = await run(validForm(email))
      lastCode = res.code
    }
    expect(lastCode).toBe('AUTH_002')

    await redis.del(`rate:action:register:${ip}`)
  })
})
