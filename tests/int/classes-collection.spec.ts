// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
let courseId: number
let userId: number
const madeClasses: number[] = []
let seq = 0
const codeFor = (tag: string) => `INT-${Date.now()}-${seq++}-${tag}`

const relId = (v: unknown): unknown => (v && typeof v === 'object' ? (v as { id: unknown }).id : v)

// Payload's `create` Options types every field with `required: true` as mandatory even
// when a `defaultValue` or an auto-generating hook fills it at runtime (`status`,
// `courses.slug`). This wrapper keeps the specs about behaviour, not about satisfying
// that over-strict input type.
type LooseData = Record<string, unknown>
type LooseDoc = Record<string, unknown> & { id: number }
const createDoc = (collection: 'classes' | 'courses', data: LooseData) =>
  payload.create({ collection, data } as Parameters<
    Payload['create']
  >[0]) as unknown as Promise<LooseDoc>

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await createDoc('courses', {
    title: 'Course for classes int test',
    courseType: 'OFFLINE',
  })
  courseId = course.id as number

  const user = await payload.create({
    collection: 'users',
    data: {
      email: `classes-int-${Date.now()}@example.com`,
      password: 'Secret123',
    },
  })
  userId = user.id as number
})

afterAll(async () => {
  for (const id of madeClasses.splice(0)) {
    await payload.delete({ collection: 'classes', id }).catch(() => {})
  }
  await payload
    .delete({ collection: 'courses', id: courseId, context: { disableRevalidate: true } })
    .catch(() => {})
  await payload.delete({ collection: 'users', id: userId }).catch(() => {})
})

const makeClass = async (over: LooseData = {}) => {
  const doc = await createDoc('classes', {
    code: codeFor('c'),
    course: courseId,
    startDate: '2026-10-01T00:00:00.000Z',
    maxStudents: 20,
    ...over,
  })
  madeClasses.push(doc.id as number)
  return doc
}

describe('classes collection', () => {
  it('creates a class with minimal data — status defaults to DRAFT, timestamps set, no endDate', async () => {
    const doc = await makeClass()

    expect(doc.status).toBe('DRAFT')
    expect(doc.createdAt).toBeTruthy()
    expect(doc.updatedAt).toBeTruthy()
    expect(relId(doc.course)).toBe(courseId)
    expect(doc.endDate ?? null).toBeNull()
  })

  it('accepts an explicit endDate', async () => {
    const doc = await makeClass({ endDate: '2026-12-20T00:00:00.000Z' })
    expect(doc.endDate).toBeTruthy()
  })

  it('rejects a create missing any required field', async () => {
    await expect(
      createDoc('classes', { course: courseId, startDate: '2026-10-01', maxStudents: 20 }),
    ).rejects.toThrow()
    await expect(
      createDoc('classes', { code: codeFor('nocourse'), startDate: '2026-10-01', maxStudents: 20 }),
    ).rejects.toThrow()
    await expect(
      createDoc('classes', { code: codeFor('nostart'), course: courseId, maxStudents: 20 }),
    ).rejects.toThrow()
    await expect(
      createDoc('classes', { code: codeFor('nomax'), course: courseId, startDate: '2026-10-01' }),
    ).rejects.toThrow()
  })

  it('rejects a duplicate code', async () => {
    const code = codeFor('dup')
    await makeClass({ code })
    await expect(makeClass({ code })).rejects.toThrow()
  })

  it('rejects a status outside the five allowed values', async () => {
    await expect(makeClass({ status: 'ARCHIVED' })).rejects.toThrow()
  })

  it('rejects maxStudents below 1', async () => {
    await expect(makeClass({ maxStudents: 0 })).rejects.toThrow()
  })

  it('denies read with no user and allows it for an authenticated user', async () => {
    await expect(payload.find({ collection: 'classes', overrideAccess: false })).rejects.toThrow()

    const user = await payload.findByID({ collection: 'users', id: userId })
    const res = await payload.find({ collection: 'classes', overrideAccess: false, user })
    expect(Array.isArray(res.docs)).toBe(true)
  })
})
