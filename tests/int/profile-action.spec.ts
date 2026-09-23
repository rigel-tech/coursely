// @vitest-environment node
// `payload.create` signs with jose, which rejects jsdom's Uint8Array realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { signAccessToken, signRefreshToken } from '@/lib/auth/session-token'
import { REFRESH_TTL_SEC } from '@/lib/constants/auth'

const ctx = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  revalidated: [] as string[],
  writes: [] as string[],
  deletes: [] as string[],
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => {
      ctx.writes.push(name)
      ctx.cookieJar.set(name, value)
    },
    delete: (name: string) => {
      ctx.deletes.push(name)
      ctx.cookieJar.delete(name)
    },
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => ctx.revalidated.push(path),
}))

const { updateProfileAction } = await import('@/actions/student/profile')

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

let payload: Payload
const madeIds = new Set<number>()
const madeMediaIds = new Set<number>()

const uniqueEmail = () => `prof-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const seedStudent = async (status: 'ACTIVE' | 'PENDING_VERIFICATION' = 'ACTIVE') => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail(), password: 'Secret123', fullName: 'Tên Cũ', status },
  })
  madeIds.add(student.id as number)
  ctx.cookieJar.set(ACCESS_COOKIE, await signAccessToken({ id: student.id as number, status }))
  return student
}

const form = (fields: Record<string, string>, avatar?: File) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  if (avatar) fd.set('avatar', avatar)
  return fd
}

const avatar = () =>
  new File(
    [
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    ],
    'avatar.png',
    { type: 'image/png' },
  )

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  ctx.cookieJar.clear()
  ctx.writes.length = 0
  ctx.deletes.length = 0
  ctx.revalidated.length = 0
  vi.restoreAllMocks()
  for (const id of madeIds) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  for (const id of madeMediaIds) {
    await payload.delete({ collection: 'media', id }).catch(() => {})
  }
  madeIds.clear()
  madeMediaIds.clear()
})

describe('updateProfileAction — happy path', () => {
  it('writes fullName and phone onto the students document', async () => {
    const student = await seedStudent()

    const res = await updateProfileAction(form({ fullName: 'Nguyễn Văn A', phone: '0912345678' }))
    expect(res.status).toBe('success')

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Nguyễn Văn A')
    expect(after.phone).toBe('0912345678')
    expect(ctx.revalidated).toContain('/tai-khoan')
  })

  it('commits the profile and avatar together', async () => {
    const student = await seedStudent()

    const res = await updateProfileAction(
      form({ fullName: 'Nguyễn Văn A', phone: '0912345678' }, avatar()),
    )
    expect(res.status).toBe('success')

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Nguyễn Văn A')
    expect(typeof after.avatar).toBe('number')
    madeMediaIds.add(after.avatar as number)
  })
})

// The end-to-end proof for the whole stage: an action reached with a lapsed access token
// and a live refresh token does the work instead of refusing. Before renewal moved out of
// `proxy`, this only passed because `proxy` had already re-minted the cookie on the page
// request that rendered the form — which it will stop doing for public pages.
describe('updateProfileAction — a lapsed access token', () => {
  it('renews from the refresh token and saves, rather than refusing', async () => {
    const student = await seedStudent()
    ctx.cookieJar.delete(ACCESS_COOKIE)
    ctx.cookieJar.set(
      REFRESH_COOKIE,
      await signRefreshToken({ id: student.id as number, status: 'ACTIVE' }, REFRESH_TTL_SEC),
    )

    const res = await updateProfileAction(form({ fullName: 'Tên Mới', phone: '0912345678' }))

    expect(res.status).toBe('success')
    expect(ctx.writes).toEqual([ACCESS_COOKIE])
    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Tên Mới')
  })
})

describe('updateProfileAction — refuses without a usable session', () => {
  it('errors with no cookie and writes nothing', async () => {
    const res = await updateProfileAction(form({ fullName: 'Không Được Ghi' }))

    expect(res.status).toBe('error')
    expect(res.message).toMatch(/đăng nhập/i)
  })

  it('errors for an account that is not ACTIVE and leaves the document alone', async () => {
    const student = await seedStudent('PENDING_VERIFICATION')

    const res = await updateProfileAction(form({ fullName: 'Không Được Ghi' }))
    expect(res.status).toBe('error')

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Tên Cũ')
  })
})

describe('updateProfileAction — invalid input', () => {
  it('rejects a malformed phone number with one message and writes nothing', async () => {
    const student = await seedStudent()

    const res = await updateProfileAction(form({ fullName: 'Tên Mới', phone: '123' }))
    expect(res.status).toBe('error')
    expect(res.message).toBeTruthy()

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Tên Cũ')
  })
})

describe('updateProfileAction — a genuine failure', () => {
  // A save failure used to be swallowed and logged with console.error. It now propagates,
  // the same as registerAction/resetPasswordAction/forgotPasswordAction — `<PersonalInfoCard>`
  // catches it and shows a system-failure banner instead of the page crashing silently.
  it('propagates instead of being logged and reported as a generic message', async () => {
    await seedStudent()
    vi.spyOn(payload, 'update').mockRejectedValue(new Error('db unreachable'))

    await expect(
      updateProfileAction(form({ fullName: 'Tên Mới', phone: '0912345678' })),
    ).rejects.toThrow('db unreachable')
  })

  it('rolls back the avatar when saving the profile fails', async () => {
    const student = await seedStudent()
    const fullName = `Tên Rollback ${Date.now()}`
    vi.spyOn(payload, 'update').mockRejectedValue(new Error('db unreachable'))

    await expect(
      updateProfileAction(form({ fullName, phone: '0912345678' }, avatar())),
    ).rejects.toThrow('db unreachable')

    const after = await payload.findByID({ collection: 'students', id: student.id, depth: 0 })
    expect(after.fullName).toBe('Tên Cũ')
    const media = await payload.find({
      collection: 'media',
      where: { alt: { equals: `Ảnh đại diện của ${fullName}` } },
    })
    expect(media.docs).toHaveLength(0)
  })
})
