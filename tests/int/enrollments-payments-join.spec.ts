// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
let courseId: number
let studentAId: number
let studentBId: number
let studentEmptyId: number
let studentAddId: number
let staffUserId: number
let enrollmentAId: number
let enrollmentBId: number
let enrollmentEmptyId: number
let enrollmentAddId: number
const madePayments: number[] = []
const madeEnrollments: number[] = []
const madeStudents: number[] = []
const madeStaff: number[] = []

type LooseData = Record<string, unknown>
type LooseDoc = Record<string, unknown> & { id: number }
const createDoc = (
  collection: 'courses' | 'students' | 'enrollments' | 'payments' | 'users',
  data: LooseData,
) =>
  payload.create({ collection, data } as Parameters<
    Payload['create']
  >[0]) as unknown as Promise<LooseDoc>

const createDocAs = (
  collection: 'courses' | 'students' | 'enrollments' | 'payments' | 'users',
  data: LooseData,
  user: unknown,
) =>
  payload.create({
    collection,
    data,
    user,
    overrideAccess: false,
  } as Parameters<Payload['create']>[0]) as unknown as Promise<LooseDoc>

const relId = (v: unknown): unknown => (v && typeof v === 'object' ? (v as { id: unknown }).id : v)

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await createDoc('courses', {
    title: 'Course for enrollments-payments join int test',
    courseType: 'OFFLINE',
  })
  courseId = course.id as number

  const studentA = await createDoc('students', {
    email: uniqueEmail('join-student-a'),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Student A',
  })
  studentAId = studentA.id as number
  madeStudents.push(studentAId)

  const studentB = await createDoc('students', {
    email: uniqueEmail('join-student-b'),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Student B',
  })
  studentBId = studentB.id as number
  madeStudents.push(studentBId)

  const enrollmentA = await createDoc('enrollments', { student: studentAId, course: courseId })
  enrollmentAId = enrollmentA.id as number
  madeEnrollments.push(enrollmentAId)

  const enrollmentB = await createDoc('enrollments', { student: studentBId, course: courseId })
  enrollmentBId = enrollmentB.id as number
  madeEnrollments.push(enrollmentBId)

  const studentEmpty = await createDoc('students', {
    email: uniqueEmail('join-student-empty'),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Student Empty',
  })
  studentEmptyId = studentEmpty.id as number
  madeStudents.push(studentEmptyId)

  const enrollmentEmpty = await createDoc('enrollments', {
    student: studentEmptyId,
    course: courseId,
  })
  enrollmentEmptyId = enrollmentEmpty.id as number
  madeEnrollments.push(enrollmentEmptyId)

  const paymentA = await createDoc('payments', {
    enrollmentId: enrollmentAId,
    studentId: studentAId,
    amount: 100000,
    paymentMethod: 'CASH',
  })
  madePayments.push(paymentA.id)

  const paymentB = await createDoc('payments', {
    enrollmentId: enrollmentBId,
    studentId: studentBId,
    amount: 200000,
    paymentMethod: 'CASH',
  })
  madePayments.push(paymentB.id)

  const staff = await createDoc('users', {
    email: uniqueEmail('join-staff'),
    password: 'Secret123',
  })
  staffUserId = staff.id as number
  madeStaff.push(staffUserId)

  const studentAdd = await createDoc('students', {
    email: uniqueEmail('join-student-add'),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Student Add',
  })
  studentAddId = studentAdd.id as number
  madeStudents.push(studentAddId)

  const enrollmentAdd = await createDoc('enrollments', {
    student: studentAddId,
    course: courseId,
  })
  enrollmentAddId = enrollmentAdd.id as number
  madeEnrollments.push(enrollmentAddId)
})

afterAll(async () => {
  for (const id of madePayments.splice(0)) {
    await payload.delete({ collection: 'payments', id }).catch(() => {})
  }
  for (const id of madeEnrollments.splice(0)) {
    await payload.delete({ collection: 'enrollments', id }).catch(() => {})
  }
  for (const id of madeStudents.splice(0)) {
    await payload.delete({ collection: 'students', id }).catch(() => {})
  }
  for (const id of madeStaff.splice(0)) {
    await payload.delete({ collection: 'users', id }).catch(() => {})
  }
  await payload.delete({ collection: 'courses', id: courseId }).catch(() => {})
})

describe('enrollments — payments join field', () => {
  it('lists only the payments belonging to that enrollment', async () => {
    const enrollment = (await payload.findByID({
      collection: 'enrollments',
      id: enrollmentAId,
      depth: 1,
    })) as unknown as LooseDoc & { payments: { docs: LooseDoc[] } }

    const ids = enrollment.payments.docs.map((doc) => doc.id)
    expect(ids).toHaveLength(1)
    expect(ids[0]).toBe(madePayments[0])
  })

  it('never lists a payment belonging to a different enrollment', async () => {
    const enrollment = (await payload.findByID({
      collection: 'enrollments',
      id: enrollmentBId,
      depth: 1,
    })) as unknown as LooseDoc & { payments: { docs: LooseDoc[] } }

    const ids = enrollment.payments.docs.map((doc) => doc.id)
    expect(ids).toHaveLength(1)
    expect(ids[0]).toBe(madePayments[1])
    expect(ids).not.toContain(madePayments[0])
  })

  it('returns an empty list for an enrollment with no payments', async () => {
    const enrollment = (await payload.findByID({
      collection: 'enrollments',
      id: enrollmentEmptyId,
      depth: 1,
    })) as unknown as LooseDoc & { payments: { docs: LooseDoc[] } }

    expect(enrollment.payments.docs).toEqual([])
  })
})

describe('enrollments — adding a payment via the join field (US2)', () => {
  it('creates a payment linked to the enrollment, the same shape the join field drawer submits, and lists it', async () => {
    const created = await createDoc('payments', {
      enrollmentId: enrollmentAddId,
      studentId: studentAddId,
      amount: 150000,
      paymentMethod: 'CASH',
    })
    madePayments.push(created.id)
    expect(relId(created.enrollmentId)).toBe(enrollmentAddId)

    const enrollment = (await payload.findByID({
      collection: 'enrollments',
      id: enrollmentAddId,
      depth: 1,
    })) as unknown as LooseDoc & { payments: { docs: LooseDoc[] } }

    expect(enrollment.payments.docs.map((doc) => doc.id)).toContain(created.id)
  })

  it('still runs the same hooks and validation as any other payment creation path', async () => {
    const staff = await payload.findByID({ collection: 'users', id: staffUserId })
    const before = Date.now()
    const created = await createDocAs(
      'payments',
      {
        enrollmentId: enrollmentAddId,
        studentId: studentAddId,
        amount: 150000,
        paymentMethod: 'CASH',
      },
      staff,
    )
    madePayments.push(created.id)
    const after = Date.now()

    expect(relId(created.userId)).toBe(staffUserId)
    const savedAt = new Date(created.paymentDate as string).getTime()
    expect(savedAt).toBeGreaterThanOrEqual(before)
    expect(savedAt).toBeLessThanOrEqual(after)

    await expect(
      createDoc('payments', {
        enrollmentId: enrollmentAddId,
        studentId: studentAddId,
        amount: -100,
        paymentMethod: 'CASH',
      }),
    ).rejects.toThrow()
  })

  it('lets a staff member add two payments to the same enrollment, one after another', async () => {
    const first = await createDoc('payments', {
      enrollmentId: enrollmentAddId,
      studentId: studentAddId,
      amount: 50000,
      paymentMethod: 'CASH',
    })
    madePayments.push(first.id)

    const second = await createDoc('payments', {
      enrollmentId: enrollmentAddId,
      studentId: studentAddId,
      amount: 75000,
      paymentMethod: 'BANK_TRANSFER',
    })
    madePayments.push(second.id)

    expect(relId(first.enrollmentId)).toBe(enrollmentAddId)
    expect(relId(second.enrollmentId)).toBe(enrollmentAddId)

    const enrollment = (await payload.findByID({
      collection: 'enrollments',
      id: enrollmentAddId,
      depth: 1,
    })) as unknown as LooseDoc & { payments: { docs: LooseDoc[] } }

    const ids = enrollment.payments.docs.map((doc) => doc.id)
    expect(ids).toContain(first.id)
    expect(ids).toContain(second.id)
  })
})
