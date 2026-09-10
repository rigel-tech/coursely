// @vitest-environment node
// `payload.resetPassword` and `payload.login` hash with jose/crypto, which reject jsdom's realm.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

const { resetPasswordAction } = await import('@/actions/auth/reset-password')

const idle = { status: 'idle' as const }
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

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const signIn = (email: string, password: string) =>
  payload.login({ collection: 'students', data: { email, password } })

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeIds.clear()
})

describe('resetPasswordAction — a valid token', () => {
  it('replaces the password: the new one works and the old one stops working', async () => {
    const student = await seedStudent()
    const token = await tokenFor(student.email)

    const res = await resetPasswordAction(
      idle,
      form({ token, password: NEW, confirmPassword: NEW }),
    )
    expect(res.status).toBe('success')

    await expect(signIn(student.email, NEW)).resolves.toBeTruthy()
    await expect(signIn(student.email, OLD)).rejects.toThrow()
  })
})

describe('resetPasswordAction — a token that cannot be honoured', () => {
  it('refuses a made-up token and leaves the password alone', async () => {
    const student = await seedStudent()

    const res = await resetPasswordAction(
      idle,
      form({ token: 'not-a-real-token', password: NEW, confirmPassword: NEW }),
    )

    expect(res.status).toBe('error')
    expect(res.message).toMatch(/hết hạn|không hợp lệ/i)
    await expect(signIn(student.email, OLD)).resolves.toBeTruthy()
  })

  it('refuses a token that has already been spent', async () => {
    const student = await seedStudent()
    const token = await tokenFor(student.email)
    await resetPasswordAction(idle, form({ token, password: NEW, confirmPassword: NEW }))

    const again = await resetPasswordAction(
      idle,
      form({ token, password: 'SecondTry789', confirmPassword: 'SecondTry789' }),
    )

    expect(again.status).toBe('error')
    await expect(signIn(student.email, NEW)).resolves.toBeTruthy()
  })
})

describe('resetPasswordAction — invalid input', () => {
  it('reports a mismatched confirmation as a field error, without touching the account', async () => {
    const student = await seedStudent()
    const token = await tokenFor(student.email)

    const res = await resetPasswordAction(
      idle,
      form({ token, password: NEW, confirmPassword: 'Different999' }),
    )

    expect(res.status).toBe('error')
    expect(res.fieldErrors?.confirmPassword).toBeTruthy()
    await expect(signIn(student.email, OLD)).resolves.toBeTruthy()
  })
})
