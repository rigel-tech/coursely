// @vitest-environment node
// payload.login signs the JWT with jose — Node realm only.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
const emails: string[] = []

const makeUser = async (role: 'ADMIN' | 'STUDENT') => {
  const email = `boundary-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  emails.push(email)
  const user = await payload.create({
    collection: 'users',
    data: { email, password: 'Secret123', role, status: 'ACTIVE' },
  })
  return { user, email, password: 'Secret123' }
}

const sessionCount = async (id: number | string) =>
  (
    (await payload.findByID({ collection: 'users', id, depth: 0, showHiddenFields: true })) as {
      sessions?: unknown[]
    }
  ).sessions?.length ?? 0

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

describe('enforceLoginBoundary', () => {
  it('rejects an ADMIN coming through the student form (context.source = student)', async () => {
    const { user, email, password } = await makeUser('ADMIN')
    await expect(
      payload.login({
        collection: 'users',
        data: { email, password },
        context: { source: 'student' },
      }),
    ).rejects.toMatchObject({ name: 'LoginBoundaryError' })
    expect(await sessionCount(user.id)).toBe(0) // transaction rolled back
  })

  it('rejects a STUDENT coming through the admin surface (no context)', async () => {
    const { user, email, password } = await makeUser('STUDENT')
    await expect(
      payload.login({ collection: 'users', data: { email, password } }),
    ).rejects.toMatchObject({ name: 'LoginBoundaryError' })
    expect(await sessionCount(user.id)).toBe(0)
  })

  it('lets a STUDENT through the student form', async () => {
    const { user, email, password } = await makeUser('STUDENT')
    const res = await payload.login({
      collection: 'users',
      data: { email, password },
      context: { source: 'student' },
    })
    expect(res.user?.id).toBe(user.id)
    expect(await sessionCount(user.id)).toBe(1)
  })

  it('lets an ADMIN through the admin surface', async () => {
    const { user, email, password } = await makeUser('ADMIN')
    const res = await payload.login({ collection: 'users', data: { email, password } })
    expect(res.user?.id).toBe(user.id)
  })
})

describe('Users.access.admin', () => {
  it('is true for ADMIN and false for STUDENT', async () => {
    const usersConfig = payload.collections.users.config
    const adminAccess = usersConfig.access?.admin
    expect(typeof adminAccess).toBe('function')

    const asAdmin = await adminAccess!({ req: { user: { role: 'ADMIN' } } } as never)
    const asStudent = await adminAccess!({ req: { user: { role: 'STUDENT' } } } as never)
    const anon = await adminAccess!({ req: { user: null } } as never)

    expect(asAdmin).toBe(true)
    expect(asStudent).toBe(false)
    expect(anon).toBeFalsy()
  })
})
