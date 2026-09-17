import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload, type Where } from 'payload'
import configPromise from '@payload-config'

import { clearOtp, readOtp } from './helpers/otp-record'
import type { RegisterValues } from '@/lib/validation/register-schema'

/**
 * Server-action context. `next/headers` has no request scope under vitest, so `cookies` is
 * mocked and every write lands in `ctx.cookieJar`. `headers` is not mocked and does not
 * need to be: the action reads nothing off the request any more. The happy path resolves
 * to `{ status: 'success' }` — the client owns the navigation to `/xac-thuc-otp`.
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

// Imported after the mocks are registered.
const { registerAction } = await import('@/actions/student/register')

let payload: Payload

const usedEmails = new Set<string>()
const uniqueEmail = (tag = 'reg') => {
  const e = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  usedEmails.add(e)
  return e
}

/**
 * What `<RegisterForm>` hands the action: one object, no `FormData`, no `terms`. The form
 * itself no longer collects a phone number, but the schema still accepts one, so it stays
 * here — an account created through some other caller must not be rejected for it.
 */
const validForm = (email: string, over: Record<string, string> = {}) => ({
  email,
  password: 'abcd1234',
  confirmPassword: 'abcd1234',
  fullName: 'Người Test',
  phone: '0900000000',
  ...over,
})

// `registerAction` is typed to what `<RegisterForm>` actually sends (`RegisterValues`, no
// `phone`), same as `loginAction`. These cases deliberately send more or less than that —
// a caller bypassing the form, exactly the one `parseRegisterInput` still guards against
// at runtime — so the cast is the point, not a workaround.
const run = (values: Record<string, unknown>) => registerAction(values as RegisterValues)

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

beforeEach(() => {
  ctx.cookieJar.clear()
  ctx.cookieOptions.clear()
})

// `ACCOUNT_CREATED` is staff-facing (specs/011) — it has no `student`, so it cannot be
// cleaned up by student id the way every other test debris here is. Each test that
// creates one pushes its id here for `afterEach` to remove.
const createdBroadcastNotificationIds: number[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  if (createdBroadcastNotificationIds.length > 0) {
    await payload.delete({
      collection: 'notifications',
      where: { id: { in: createdBroadcastNotificationIds } },
    })
    createdBroadcastNotificationIds.length = 0
  }
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

describe('registerAction — new email', () => {
  it('creates the user + welcome notification, issues an OTP, sets the cookie and returns success', async () => {
    const email = uniqueEmail()
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    const broadcastWhere: Where = {
      and: [{ type: { equals: 'ACCOUNT_CREATED' } }, { student: { exists: false } }],
    }
    const before = await payload.count({
      collection: 'notifications',
      where: broadcastWhere,
    })

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
    const staff = await payload.count({
      collection: 'users',
      where: { email: { equals: email } },
    })
    expect(staff.totalDocs).toBe(0)

    // ACCOUNT_CREATED is staff-facing (specs/011): a broadcast every signed-in staff
    // member sees, never attached to the registering student's own record. It is raised
    // fire-and-forget from `notifyAccountCreated` (not awaited by `registerAction`), so
    // this polls instead of reading right after the action resolves.
    const staffNotes = await vi.waitFor(async () => {
      const result = await payload.find({
        collection: 'notifications',
        where: broadcastWhere,
        sort: '-createdAt',
        limit: 1,
        depth: 0,
      })
      expect(result.totalDocs).toBe(before.totalDocs + 1)
      return result
    })
    createdBroadcastNotificationIds.push(staffNotes.docs[0].id)

    const ownNotes = await payload.find({
      collection: 'notifications',
      where: { student: { equals: docs[0].id } },
      depth: 0,
    })
    expect(ownNotes.docs).toHaveLength(0)

    // The action stopped reading `headers()`, so there is no IP and no user agent to
    // record. The `metadata` column is still on the collection and still writable by
    // anything else that raises a notification — what must not come back is this shape.
    expect(staffNotes.docs[0].metadata ?? {}).not.toHaveProperty('ip')
    expect(staffNotes.docs[0].metadata ?? {}).not.toHaveProperty('userAgent')

    expect(await readOtp(payload, email)).toBeTruthy()
    expect(ctx.cookieJar.get('pending_email')).toBe(email)
    expect(ctx.cookieOptions.get('pending_email')).toMatchObject({ httpOnly: true })
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('registerAction — existing ACTIVE email', () => {
  it('reports the email as taken, sends a duplicate-attempt email, and does not proceed to OTP', async () => {
    const email = uniqueEmail('active')
    await payload.create({
      collection: 'students',
      data: { email, password: 'abcd1234', status: 'ACTIVE' },
    })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    expect(await run(validForm(email))).toEqual({
      status: 'error',
      field: 'email',
      message: 'Email đã tồn tại.',
    })

    const { totalDocs } = await payload.count({
      collection: 'students',
      where: { email: { equals: email } },
    })
    expect(totalDocs).toBe(1)
    expect(await readOtp(payload, email)).toBeNull()
    expect(ctx.cookieJar.get('pending_email')).toBeUndefined()
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
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    expect(await run(validForm(email))).toEqual({ status: 'success' })
    expect(
      await run(validForm(email, { password: 'newpass123', confirmPassword: 'newpass123' })),
    ).toEqual({ status: 'success' })

    const notes = await payload.count({
      collection: 'notifications',
      where: { student: { equals: existing.id } },
    })
    expect(notes.totalDocs).toBe(0)
    expect(await readOtp(payload, email)).toBeTruthy()

    // Credentials were refreshed: the stored hash changed.
    const after = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      showHiddenFields: true,
      depth: 0,
    })
    expect((after.docs[0] as { hash?: string }).hash).toBeTruthy()
    expect((after.docs[0] as { hash?: string }).hash).not.toBe(oldHash)
    expect(sendEmail).toHaveBeenCalledTimes(1)
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

    expect(await readOtp(payload, email)).toBeNull()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(ctx.cookieJar.get('pending_email')).toBe(email)
  })
})

describe('registerAction — the welcome notification is not required to succeed', () => {
  // The notification write is no longer part of the student-create transaction (it fires
  // after that write succeeds, fire-and-forget) — a failure there is logged, not thrown,
  // and does not roll the student back.
  it('creates the student and returns success even when the notification write fails', async () => {
    const email = uniqueEmail('notif-fail')
    const realCreate = payload.create.bind(payload)
    vi.spyOn(payload, 'create').mockImplementation(
      async (args: Parameters<typeof payload.create>[0]) => {
        if (args.collection === 'notifications') throw new Error('boom')
        return realCreate(args)
      },
    )

    await expect(run(validForm(email))).resolves.toEqual({ status: 'success' })

    vi.restoreAllMocks()
    const { totalDocs } = await payload.count({
      collection: 'students',
      where: { email: { equals: email } },
    })
    expect(totalDocs).toBe(1)
  })
})

describe('registerAction — guards', () => {
  it('returns one error message on invalid input and writes nothing', async () => {
    const email = uniqueEmail('invalid')
    const result = await run(validForm(email, { email: 'nope', confirmPassword: 'mismatch99' }))

    expect(result).toEqual({
      status: 'error',
      message: 'Vui lòng kiểm tra lại thông tin đã nhập.',
    })
    const { totalDocs } = await payload.count({
      collection: 'students',
      where: { email: { equals: email } },
    })
    expect(totalDocs).toBe(0)
  })
})
