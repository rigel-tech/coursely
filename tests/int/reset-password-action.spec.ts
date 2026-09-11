// @vitest-environment node
// `payload.resetPassword` and `payload.login` hash with jose/crypto, which reject jsdom's realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

const { resetPasswordAction } = await import('@/actions/student/reset-password')

const OLD = 'OldPass123'
const NEW = 'BrandNew456'

let payload: Payload
const madeIds = new Set<number>()

const uniqueEmail = () => `reset-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async () => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: OLD, status: 'ACTIVE' },
  })
  madeIds.add(student.id as number)
  return student
}

/** Run the real forgot-password step so the token under test is one Payload issued. */
const tokenFor = async (email: string) =>
  (await payload.forgotPassword({
    collection: 'students',
    data: { email },
    disableEmail: true,
  })) as string

const signIn = (email: string, password: string) =>
  payload.login({ collection: 'students', data: { email, password } })

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeIds.clear()
})

describe('resetPasswordAction — a valid token', () => {
  it('replaces the password: the new one works and the old one stops working', async () => {
    const student = await seedStudent()
    const token = await tokenFor(student.email)

    const res = await resetPasswordAction({ token, password: NEW, confirmPassword: NEW })
    expect(res.status).toBe('success')

    await expect(signIn(student.email, NEW)).resolves.toBeTruthy()
    await expect(signIn(student.email, OLD)).rejects.toThrow()
  })
})

describe('resetPasswordAction — a token that cannot be honoured', () => {
  it('refuses a made-up token and leaves the password alone', async () => {
    const student = await seedStudent()

    const res = await resetPasswordAction({
      token: 'not-a-real-token',
      password: NEW,
      confirmPassword: NEW,
    })

    expect(res.status).toBe('error')
    expect(res.message).toMatch(/hết hạn|không hợp lệ/i)
    await expect(signIn(student.email, OLD)).resolves.toBeTruthy()
  })

  it('refuses a token that has already been spent', async () => {
    const student = await seedStudent()
    const token = await tokenFor(student.email)
    await resetPasswordAction({ token, password: NEW, confirmPassword: NEW })

    const again = await resetPasswordAction({
      token,
      password: 'SecondTry789',
      confirmPassword: 'SecondTry789',
    })

    expect(again.status).toBe('error')
    await expect(signIn(student.email, NEW)).resolves.toBeTruthy()
  })
})

describe('resetPasswordAction — invalid input', () => {
  it('reports a mismatched confirmation with one message, without touching the account', async () => {
    const student = await seedStudent()
    const token = await tokenFor(student.email)

    const res = await resetPasswordAction({
      token,
      password: NEW,
      confirmPassword: 'Different999',
    })

    expect(res.status).toBe('error')
    expect(res.message).toBeTruthy()
    await expect(signIn(student.email, OLD)).resolves.toBeTruthy()
  })
})

describe('resetPasswordAction — a genuine failure', () => {
  // `payload.resetPassword` only ever throws `APIError` for a token it cannot honour (see
  // its own source: no user found for the token). Anything else is a real failure and must
  // reach the caller instead of being reported as the same fixed "invalid link" message.
  it('propagates instead of being reported as an invalid link', async () => {
    const student = await seedStudent()
    const token = await tokenFor(student.email)
    vi.spyOn(payload, 'resetPassword').mockRejectedValue(new Error('db unreachable'))

    await expect(
      resetPasswordAction({ token, password: NEW, confirmPassword: NEW }),
    ).rejects.toThrow('db unreachable')
  })
})
