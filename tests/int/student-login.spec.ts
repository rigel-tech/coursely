// @vitest-environment node
// The whole point of this spec is that `instanceof` recognises the error Payload itself
// constructed and threw, so nothing here may stub Payload out. It talks to the real
// database and calls the real `payload.login`.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AuthenticationError, getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { authenticateStudent } from '@/services/student-login'
import { EmailNotVerified, LoginRefused } from '@/lib/errors/auth'
import { clearOtp } from './helpers/otp-record'

let payload: Payload

/** Addresses that have a row behind them, so `afterEach` only queries for real ones. */
const seeded = new Set<string>()

const address = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const makeStudent = async (status: 'ACTIVE' | 'DISABLED' | 'PENDING_VERIFICATION' = 'ACTIVE') => {
  const email = address('svc')
  const password = 'Secret123'
  const student = await payload.create({
    collection: 'students',
    data: { email, password, status },
  })
  seeded.add(email)
  return { email, password, student }
}

/** The rejection, whatever it is — `.catch` rather than `rejects` so it can be inspected. */
const refusal = (input: { email: string; password: string }): Promise<unknown> =>
  authenticateStudent(input).then(
    (ok) => ok,
    (err) => err,
  )

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const email of seeded) {
    await clearOtp(payload, email)
    const { docs } = await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 10,
      depth: 0,
    })
    for (const doc of docs) {
      await payload.delete({ collection: 'notifications', where: { student: { equals: doc.id } } })
      await payload.delete({ collection: 'students', id: doc.id })
    }
  }
  seeded.clear()
})

describe('authenticateStudent — credentials Payload itself refuses', () => {
  it("rejects with Payload's own AuthenticationError, not a look-alike", async () => {
    const { email } = await makeStudent()

    // `instanceof`, not `err.name === 'AuthenticationError'`. This is the assertion that
    // notices if a second copy of payload ever lands in node_modules — a name comparison
    // would keep passing while every error fell through to the wrong branch.
    expect(await refusal({ email, password: 'WrongPass1' })).toBeInstanceOf(AuthenticationError)
  })

  it('gives an unknown address the same rejection as a wrong password', async () => {
    expect(await refusal({ email: address('ghost'), password: 'Whatever1' })).toBeInstanceOf(
      AuthenticationError,
    )
  })
})

describe('authenticateStudent — the status gate this app owns', () => {
  it('refuses a DISABLED account with LoginRefused and leaves lastLoginAt alone', async () => {
    const { email, password, student } = await makeStudent('DISABLED')

    const err = await refusal({ email, password })
    expect(err).toBeInstanceOf(LoginRefused)
    expect((err as Error).message).toMatch(/khóa/)

    expect(
      (await payload.findByID({ collection: 'students', id: student.id, depth: 0 })).lastLoginAt,
    ).toBeFalsy()
  })

  it('refuses an unverified account with EmailNotVerified carrying the address', async () => {
    vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const { email, password } = await makeStudent('PENDING_VERIFICATION')

    const err = await refusal({ email, password })
    expect(err).toBeInstanceOf(EmailNotVerified)
    // The address is what the action needs for the `pending_email` cookie; reading it
    // back off the error is what keeps the action from querying for it again.
    expect((err as EmailNotVerified).email).toBe(email)
  })

  it('lets an ACTIVE account through and stamps lastLoginAt', async () => {
    const { email, password, student } = await makeStudent()

    const result = await authenticateStudent({ email, password })
    expect(result.student.id).toBe(student.id)

    expect(
      (await payload.findByID({ collection: 'students', id: student.id, depth: 0 })).lastLoginAt,
    ).toBeTruthy()
  })
})
