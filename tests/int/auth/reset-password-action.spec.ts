// @vitest-environment node
// payload.login / resetPassword sign JWTs with jose — Node realm only.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

const { resetPasswordAction } = await import('@/actions/auth/reset-password')

let payload: Payload
const emails: string[] = []

const makeUser = async () => {
  const email = `reset-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  emails.push(email)
  const user = await payload.create({
    collection: 'users',
    data: { email, password: 'OldSecret123', role: 'STUDENT', status: 'ACTIVE' },
  })
  return { user, email }
}

const sessions = async (id: number | string) =>
  (
    (await payload.findByID({ collection: 'users', id, depth: 0, showHiddenFields: true })) as {
      sessions?: { id: string }[]
    }
  ).sessions ?? []

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const email of emails.splice(0)) {
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      depth: 0,
    })
    for (const u of docs) await payload.delete({ collection: 'users', id: u.id })
  }
})

describe('resetPasswordAction', () => {
  it('resets the password and revokes every existing session', async () => {
    const { user, email } = await makeUser()
    await payload.login({
      collection: 'users',
      data: { email, password: 'OldSecret123' },
      context: { source: 'student' },
    })
    await payload.login({
      collection: 'users',
      data: { email, password: 'OldSecret123' },
      context: { source: 'student' },
    })
    expect((await sessions(user.id)).length).toBe(2)

    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })

    const res = await resetPasswordAction(
      { status: 'idle' },
      form({ token, password: 'BrandNew123', confirmPassword: 'BrandNew123' }),
    )
    expect(res.status).toBe('success')

    expect((await sessions(user.id)).length).toBe(0)
    await expect(
      payload.login({
        collection: 'users',
        data: { email, password: 'BrandNew123' },
        context: { source: 'student' },
      }),
    ).resolves.toMatchObject({ user: { id: user.id } })
  })
})
