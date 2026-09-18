// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
let courseId: number
const madePayments: number[] = []
const madeEnrollments: number[] = []
const madeStudents: number[] = []

type LooseData = Record<string, unknown>
type LooseDoc = Record<string, unknown> & { id: number }
const createDoc = (
  collection: 'courses' | 'students' | 'enrollments' | 'payments',
  data: LooseData,
) =>
  payload.create({ collection, data } as Parameters<
    Payload['create']
  >[0]) as unknown as Promise<LooseDoc>

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await createDoc('courses', {
    title: 'Course for enrollment-delete-guard int test',
    courseType: 'OFFLINE',
  })
  courseId = course.id as number
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
  await payload.delete({ collection: 'courses', id: courseId }).catch(() => {})
})

const createEnrollment = async (tag: string) => {
  const student = await createDoc('students', {
    email: uniqueEmail(tag),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: tag,
  })
  madeStudents.push(student.id as number)

  const enrollment = await createDoc('enrollments', { student: student.id, course: courseId })
  madeEnrollments.push(enrollment.id as number)

  return { enrollmentId: enrollment.id as number, studentId: student.id as number }
}

describe('enrollments — deleting an enrollment that already has a payment', () => {
  it('rejects the delete instead of letting Postgres reject it with a raw FK error', async () => {
    const { enrollmentId, studentId } = await createEnrollment('delete-guard-blocked')
    const payment = await createDoc('payments', {
      enrollmentId,
      studentId,
      amount: 100000,
      paymentMethod: 'CASH',
    })
    madePayments.push(payment.id)

    await expect(payload.delete({ collection: 'enrollments', id: enrollmentId })).rejects.toThrow(
      /đã có thanh toán/,
    )

    const stillThere = await payload.findByID({ collection: 'enrollments', id: enrollmentId })
    expect(stillThere.id).toBe(enrollmentId)
  })

  it('allows deleting an enrollment with no payment', async () => {
    const { enrollmentId } = await createEnrollment('delete-guard-clean')

    await payload.delete({ collection: 'enrollments', id: enrollmentId })

    await expect(
      payload.findByID({ collection: 'enrollments', id: enrollmentId }),
    ).rejects.toThrow()
    madeEnrollments.splice(madeEnrollments.indexOf(enrollmentId), 1)
  })
})
