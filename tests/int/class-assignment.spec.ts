// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { ClassCourseMismatch, ClassFull } from '@/lib/errors/enrollment'

let payload: Payload
let courseId: number
let otherCourseId: number
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

const makeClass = async ({ course, maxStudents }: { course: number; maxStudents: number }) => {
  const created = await createDoc('classes', {
    code: `ASSIGN-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    course,
    startDate: '2099-01-01T00:00:00.000Z',
    maxStudents,
    status: 'OPEN',
  })
  madeClasses.push(created.id)
  return created.id
}

const makeEnrollment = async ({
  course,
  enrollmentStatus = 'CONFIRMED',
}: {
  course: number
  enrollmentStatus?: string
}) => {
  const student = await createDoc('students', {
    email: uniqueEmail('assign'),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Học viên xếp lớp',
  })
  madeStudents.push(student.id)

  const enrollment = await createDoc('enrollments', {
    student: student.id,
    course,
    enrollmentStatus,
    paymentStatus: 'UNPAID',
  })
  madeEnrollments.push(enrollment.id)

  return enrollment.id
}

const assignTo = ({ enrollmentId, classId }: { enrollmentId: number; classId: number | null }) =>
  payload.update({
    collection: 'enrollments',
    id: enrollmentId,
    data: { class: classId },
    overrideAccess: true,
  } as Parameters<Payload['update']>[0])

const readEnrollment = (enrollmentId: number) =>
  payload.findByID({ collection: 'enrollments', id: enrollmentId, depth: 0 })

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await createDoc('courses', {
    title: 'Course for class-assignment int test',
    courseType: 'OFFLINE',
  })
  courseId = course.id

  const otherCourse = await createDoc('courses', {
    title: 'Other course for class-assignment int test',
    courseType: 'OFFLINE',
  })
  otherCourseId = otherCourse.id
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
  await payload
    .delete({ collection: 'courses', id: otherCourseId, context: { disableRevalidate: true } })
    .catch(() => {})
})

describe('assigning an enrollment to a class', () => {
  it('records the class and when it was assigned, leaving enrollmentStatus alone', async () => {
    const classId = await makeClass({ course: courseId, maxStudents: 5 })
    const enrollmentId = await makeEnrollment({ course: courseId })

    const before = Date.now()
    await assignTo({ enrollmentId, classId })
    const after = Date.now()

    const doc = await readEnrollment(enrollmentId)
    expect(doc.class).toBe(classId)
    expect(doc.enrollmentStatus).toBe('CONFIRMED')

    const assignedAt = new Date(doc.classAssignedAt as string).getTime()
    expect(assignedAt).toBeGreaterThanOrEqual(before)
    expect(assignedAt).toBeLessThanOrEqual(after)
  })

  it('clears both the class and the assignment time when the student is taken out', async () => {
    const classId = await makeClass({ course: courseId, maxStudents: 5 })
    const enrollmentId = await makeEnrollment({ course: courseId })
    await assignTo({ enrollmentId, classId })

    await assignTo({ enrollmentId, classId: null })

    const doc = await readEnrollment(enrollmentId)
    expect(doc.class).toBeNull()
    expect(doc.classAssignedAt).toBeNull()
    expect(doc.enrollmentStatus).toBe('CONFIRMED')
  })
})

describe('the seat guard refuses, whatever path the write comes from', () => {
  it('refuses a class that is already full — through the Local API, not the new screen', async () => {
    const classId = await makeClass({ course: courseId, maxStudents: 1 })
    const seated = await makeEnrollment({ course: courseId })
    await assignTo({ enrollmentId: seated, classId })

    const turnedAway = await makeEnrollment({ course: courseId })
    await expect(assignTo({ enrollmentId: turnedAway, classId })).rejects.toBeInstanceOf(ClassFull)

    const doc = await readEnrollment(turnedAway)
    expect(doc.class).toBeNull()
    expect(doc.classAssignedAt).toBeNull()
  })

  it('refuses a class belonging to a different course', async () => {
    const foreignClass = await makeClass({ course: otherCourseId, maxStudents: 5 })
    const enrollmentId = await makeEnrollment({ course: courseId })

    await expect(assignTo({ enrollmentId, classId: foreignClass })).rejects.toBeInstanceOf(
      ClassCourseMismatch,
    )

    const doc = await readEnrollment(enrollmentId)
    expect(doc.class).toBeNull()
  })
})
