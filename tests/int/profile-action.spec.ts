// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { signAccessToken } from '@/services/session-token'

const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  revalidated: [] as string[],
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => ctx.revalidated.push(path),
}))

const { updateProfileAction } = await import('@/actions/student/profile')

const ACCESS_COOKIE = 'coursely-access'
const idle = { status: 'idle' as const }

let payload: Payload
const madeIds = new Set<number>()

const uniqueEmail = () => `prof-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async (status: 'ACTIVE' | 'PENDING_VERIFICATION' = 'ACTIVE') => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: 'Secret123', fullName: 'Tên Cũ', status },
  })
  madeIds.add(student.id as number)
  ctx.cookieJar.set(ACCESS_COOKIE, signAccessToken({ sub: student.id as number, status }))
  return student
}

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  ctx.cookieJar.clear()
  ctx.revalidated.length = 0
  vi.restoreAllMocks()
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  madeIds.clear()
})

describe('updateProfileAction — happy path', () => {
  it('writes fullName and phone onto the students document', async () => {
    const student = await seedStudent()

    const res = await updateProfileAction(
      idle,
      form({ fullName: 'Nguyễn Văn A', phone: '0912345678' }),
    )
    expect(res.status).toBe('success')

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Nguyễn Văn A')
    expect(after.phone).toBe('0912345678')
    expect(ctx.revalidated).toContain('/tai-khoan')
  })
})

describe('updateProfileAction — refuses without a usable session', () => {
  it('errors with no cookie and writes nothing', async () => {
    const res = await updateProfileAction(idle, form({ fullName: 'Không Được Ghi' }))

    expect(res.status).toBe('error')
    expect(res.message).toMatch(/đăng nhập/i)
  })

  it('errors for an account that is not ACTIVE and leaves the document alone', async () => {
    const student = await seedStudent('PENDING_VERIFICATION')

    const res = await updateProfileAction(idle, form({ fullName: 'Không Được Ghi' }))
    expect(res.status).toBe('error')

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Tên Cũ')
  })
})

describe('updateProfileAction — invalid input', () => {
  it('rejects a malformed phone number with a field error and writes nothing', async () => {
    const student = await seedStudent()

    const res = await updateProfileAction(idle, form({ fullName: 'Tên Mới', phone: '123' }))
    expect(res.status).toBe('error')
    expect(res.fieldErrors?.phone).toBeTruthy()

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Tên Cũ')
  })
})
