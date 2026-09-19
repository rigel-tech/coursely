// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { assignStudentsToClass } from '@/services/class-assignment'
import { ClassFull, EnrollmentNotAssignable } from '@/lib/errors/enrollment'

let payload: Payload
let courseId: number
const madeStudents: number[] = []
const madeEnrollments: number[] = []
const madeClasses: number[] = []

type LooseData = Record<string, unknown>
type LooseDoc = Record<string, unknown> & { id: number }

const createDoc = (
  collection: 'courses' | 'classes' | 'students' | 'enrollments',
  data: LooseData,
) =>
  payload.create({ collection, data } as Parameters<
    Payload['create']
  >[0]) as unknown as Promise<LooseDoc>

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const makeClass = async (maxStudents: number) => {
  const created = await createDoc('classes', {
    code: `BATCH-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    course: courseId,
    startDate: '2099-01-01T00:00:00.000Z',
    maxStudents,
    status: 'OPEN',
  })
  madeClasses.push(created.id)
  return created.id
}

const makeEnrollment = async (overrides: LooseData = {}) => {
  const student = await createDoc('students', {
    email: uniqueEmail('batch'),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Học viên xếp lô',
  })
  madeStudents.push(student.id)

  const enrollment = await createDoc('enrollments', {
    student: student.id,
    course: courseId,
    enrollmentStatus: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    ...overrides,
  })
  madeEnrollments.push(enrollment.id)

  return enrollment.id
}

const readEnrollment = (enrollmentId: number) =>
  payload.findByID({ collection: 'enrollments', id: enrollmentId, depth: 0 })

const countSeated = async (classId: number) => {
  const { totalDocs } = await payload.count({
    collection: 'enrollments',
    where: { class: { equals: classId } },
  })
  return totalDocs
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await createDoc('courses', {
    title: 'Course for class-assignment batch int test',
    courseType: 'OFFLINE',
  })
  courseId = course.id
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
  await payload.delete({ collection: 'courses', id: courseId }).catch(() => {})
})

describe('assignStudentsToClass — the happy batch', () => {
  it('seats every enrollment in the batch, each with its own classAssignedAt', async () => {
    const classId = await makeClass(10)
    const enrollmentIds = await Promise.all([makeEnrollment(), makeEnrollment(), makeEnrollment()])

    await assignStudentsToClass(classId, enrollmentIds)

    const docs = await Promise.all(enrollmentIds.map(readEnrollment))
    for (const doc of docs) {
      expect(doc.class).toBe(classId)
      expect(doc.classAssignedAt).toBeTruthy()
    }
  })
})

describe('assignStudentsToClass — refuses the whole batch, not a partial one', () => {
  it('seats nobody when the batch would exceed the remaining seats', async () => {
    const classId = await makeClass(2)
    const alreadySeated = await makeEnrollment()
    await assignStudentsToClass(classId, [alreadySeated])

    const candidates = await Promise.all([makeEnrollment(), makeEnrollment()])

    await expect(assignStudentsToClass(classId, candidates)).rejects.toBeInstanceOf(ClassFull)

    expect(await countSeated(classId)).toBe(1)
    const docs = await Promise.all(candidates.map(readEnrollment))
    for (const doc of docs) {
      expect(doc.class).toBeNull()
    }
  })

  it('rejects a batch that includes an enrollment already in a class', async () => {
    const classId = await makeClass(10)
    const alreadyPlacedElsewhere = await makeEnrollment()
    await assignStudentsToClass(classId, [alreadyPlacedElsewhere])

    const freshOne = await makeEnrollment()

    await expect(
      assignStudentsToClass(classId, [freshOne, alreadyPlacedElsewhere]),
    ).rejects.toBeInstanceOf(EnrollmentNotAssignable)

    expect((await readEnrollment(freshOne)).class).toBeNull()
  })

  it('rejects a batch that includes a NEW (unconfirmed) enrollment', async () => {
    const classId = await makeClass(10)
    const confirmed = await makeEnrollment()
    const unconfirmed = await makeEnrollment({ enrollmentStatus: 'NEW' })

    await expect(assignStudentsToClass(classId, [confirmed, unconfirmed])).rejects.toBeInstanceOf(
      EnrollmentNotAssignable,
    )

    expect((await readEnrollment(confirmed)).class).toBeNull()
  })
})

describe('assignStudentsToClass — closes the race between two concurrent assignments', () => {
  it('lets exactly one of two concurrent batches win the last seat', async () => {
    const classId = await makeClass(1)
    const [candidateA, candidateB] = await Promise.all([makeEnrollment(), makeEnrollment()])

    const results = await Promise.allSettled([
      assignStudentsToClass(classId, [candidateA]),
      assignStudentsToClass(classId, [candidateB]),
    ])

    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result) => result.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ClassFull)
    expect(await countSeated(classId)).toBe(1)
  })
})
