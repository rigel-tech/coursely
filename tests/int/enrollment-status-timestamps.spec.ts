// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
let courseId: number
const madeEnrollments: number[] = []
const madeStudents: number[] = []
const madeClasses: number[] = []

type LooseDoc = Record<string, unknown> & {
  id: number
  confirmedAt: string | null
  classAssignedAt: string | null
  cancelledAt: string | null
}

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const createEnrollment = async (): Promise<{ id: number }> => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail('timestamp-student'), password: 'Secret123', status: 'ACTIVE' },
  })
  madeStudents.push(student.id as number)

  const enrollment = (await payload.create({
    collection: 'enrollments',
    data: { student: student.id, course: courseId },
  } as Parameters<Payload['create']>[0])) as unknown as { id: number }
  madeEnrollments.push(enrollment.id)

  return enrollment
}

const setStatus = (id: number, enrollmentStatus: string) =>
  payload.update({
    collection: 'enrollments',
    id,
    data: { enrollmentStatus },
  } as Parameters<Payload['update']>[0]) as unknown as Promise<LooseDoc>

const createClass = async (): Promise<{ id: number }> => {
  const classDoc = (await payload.create({
    collection: 'classes',
    data: {
      code: `TEST-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      course: courseId,
      startDate: new Date().toISOString(),
      maxStudents: 20,
    },
  } as Parameters<Payload['create']>[0])) as unknown as { id: number }
  return classDoc
}

const assignClass = (id: number, classId: number) =>
  payload.update({
    collection: 'enrollments',
    id,
    data: { class: classId },
  } as Parameters<Payload['update']>[0]) as unknown as Promise<LooseDoc>

const readEnrollment = (id: number) =>
  payload.findByID({ collection: 'enrollments', id, depth: 0 }) as unknown as Promise<LooseDoc>

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await payload.create({
    collection: 'courses',
    data: { title: 'Course for enrollment status timestamps int test', courseType: 'OFFLINE' },
  } as Parameters<Payload['create']>[0])
  courseId = course.id as number
})

afterAll(async () => {
  for (const id of madeEnrollments.splice(0)) {
    await payload.delete({ collection: 'enrollments', id }).catch(() => {})
  }
  for (const id of madeClasses.splice(0)) {
    await payload.delete({ collection: 'classes', id }).catch(() => {})
  }
  for (const id of madeStudents.splice(0)) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  await payload
    .delete({ collection: 'courses', id: courseId, context: { disableRevalidate: true } })
    .catch(() => {})
})

describe('enrollment status timestamps', () => {
  it('sets confirmedAt when enrollmentStatus becomes CONFIRMED', async () => {
    const enrollment = await createEnrollment()
    const before = Date.now()
    const updated = await setStatus(enrollment.id, 'CONFIRMED')
    const after = Date.now()

    expect(updated.confirmedAt).toBeTruthy()
    const stamped = new Date(updated.confirmedAt as string).getTime()
    expect(stamped).toBeGreaterThanOrEqual(before)
    expect(stamped).toBeLessThanOrEqual(after)
    expect(updated.classAssignedAt).toBeFalsy()
    expect(updated.cancelledAt).toBeFalsy()
  })

  it('sets classAssignedAt when the class field is assigned, independent of enrollmentStatus', async () => {
    const enrollment = await createEnrollment()
    const classDoc = await createClass()
    madeClasses.push(classDoc.id)

    const before = Date.now()
    const updated = await assignClass(enrollment.id, classDoc.id)
    const after = Date.now()

    expect(updated.classAssignedAt).toBeTruthy()
    const stamped = new Date(updated.classAssignedAt as string).getTime()
    expect(stamped).toBeGreaterThanOrEqual(before)
    expect(stamped).toBeLessThanOrEqual(after)
  })

  it('does not re-stamp classAssignedAt on a later unrelated save', async () => {
    const enrollment = await createEnrollment()
    const classDoc = await createClass()
    madeClasses.push(classDoc.id)

    const assigned = await assignClass(enrollment.id, classDoc.id)

    const resaved = await setStatus(enrollment.id, 'CONFIRMED')

    expect(resaved.classAssignedAt).toBe(assigned.classAssignedAt)
  })

  it('sets cancelledAt when enrollmentStatus becomes CANCELLED', async () => {
    const enrollment = await createEnrollment()
    const updated = await setStatus(enrollment.id, 'CANCELLED')

    expect(updated.cancelledAt).toBeTruthy()
  })

  it('leaves every status timestamp untouched when enrollmentStatus does not change', async () => {
    const enrollment = await createEnrollment()
    const confirmed = await setStatus(enrollment.id, 'CONFIRMED')

    const resaved = (await payload.update({
      collection: 'enrollments',
      id: enrollment.id,
      data: { enrollmentStatus: 'CONFIRMED' },
    } as Parameters<Payload['update']>[0])) as unknown as LooseDoc

    expect(resaved.confirmedAt).toBe(confirmed.confirmedAt)
  })

  it('re-stamps confirmedAt when an enrollment re-enters CONFIRMED after being CANCELLED', async () => {
    const enrollment = await createEnrollment()
    const firstConfirm = await setStatus(enrollment.id, 'CONFIRMED')
    await setStatus(enrollment.id, 'CANCELLED')

    await new Promise((resolve) => setTimeout(resolve, 10))
    const secondConfirm = await setStatus(enrollment.id, 'CONFIRMED')

    expect(secondConfirm.confirmedAt).not.toBe(firstConfirm.confirmedAt)
    expect(new Date(secondConfirm.confirmedAt as string).getTime()).toBeGreaterThan(
      new Date(firstConfirm.confirmedAt as string).getTime(),
    )
  })
})
