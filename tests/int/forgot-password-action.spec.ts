// @vitest-environment node
// `payload.forgotPassword` hashes with jose/crypto, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

const { forgotPasswordAction } = await import('@/actions/student/forgot-password')

let payload: Payload
const madeIds = new Set<number>()

const uniqueEmail = () => `forgot-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async () => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: 'OldPass123', status: 'ACTIVE' },
  })
  madeIds.add(student.id as number)
  return student
}

/** `resetPasswordToken` is a hidden auth field, so it needs asking for by name. */
const tokenOf = async (id: number) => {
  const doc = (await payload.findByID({
    collection: 'students',
    id,
    depth: 0,
    showHiddenFields: true,
  })) as { resetPasswordToken?: string }
  return doc.resetPasswordToken
}

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

describe('forgotPasswordAction — a student who exists', () => {
  it('mints a reset token on the students document and emails the link', async () => {
    const student = await seedStudent()
    expect(await tokenOf(student.id as number)).toBeFalsy()
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    const res = await forgotPasswordAction(student.email)

    expect(res.status).toBe('success')
    expect(await tokenOf(student.id as number)).toBeTruthy()
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('forgotPasswordAction — anti-enumeration', () => {
  it('answers an unknown address with the same success message and sends nothing', async () => {
    const known = await seedStudent()
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    const hit = await forgotPasswordAction(known.email)
    const miss = await forgotPasswordAction(uniqueEmail())

    // Identical down to the wording — the response must not distinguish the two.
    expect(miss.status).toBe(hit.status)
    expect(miss.message).toBe(hit.message)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('rejects a malformed address with one message, not a field map', async () => {
    const res = await forgotPasswordAction('not-an-email')

    expect(res.status).toBe('error')
    expect(res.message).toBeTruthy()
  })
})

describe('forgotPasswordAction — staff are not students', () => {
  it('does not mint a token for a users row, and does not say so', async () => {
    const email = uniqueEmail()
    const staff = await payload.create({
      collection: 'users',
      data: { email, password: 'Staff123' },
    })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)

    try {
      const res = await forgotPasswordAction(email)

      expect(res.status).toBe('success')
      expect(sendEmail).not.toHaveBeenCalled()
    } finally {
      await payload.delete({ collection: 'users', id: staff.id }).catch(() => {})
    }
  })
})

describe('forgotPasswordAction — a genuine failure', () => {
  // `payload.forgotPassword` never throws for "not found" (it returns `null` — see its own
  // source comment on why). A thrown error here is therefore a real failure, and must reach
  // the caller instead of being reported as the same fixed success every other case gets.
  it('propagates instead of being swallowed as a fake success', async () => {
    vi.spyOn(payload, 'forgotPassword').mockRejectedValue(new Error('db unreachable'))

    await expect(forgotPasswordAction(uniqueEmail())).rejects.toThrow('db unreachable')
  })
})
