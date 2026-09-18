// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
let courseId: number
const madePayments: number[] = []
const madeEnrollments: number[] = []
const madeStudents: number[] = []

type LooseDoc = Record<string, unknown> & { id: number; paymentStatus: string }

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const createEnrollment = async (): Promise<{ id: number }> => {
  const student = await payload.create({
    collection: 'students',
    data: { email: uniqueEmail('status-student'), password: 'Secret123', status: 'ACTIVE' },
  })
  madeStudents.push(student.id as number)

  const enrollment = (await payload.create({
    collection: 'enrollments',
    data: { student: student.id, course: courseId },
  } as Parameters<Payload['create']>[0])) as unknown as { id: number }
  madeEnrollments.push(enrollment.id)

  return enrollment
}

const createPayment = async (enrollmentId: number, amount: number): Promise<{ id: number }> => {
  const payment = (await payload.create({
    collection: 'payments',
    data: { enrollmentId, amount, paymentMethod: 'CASH' },
  } as Parameters<Payload['create']>[0])) as unknown as { id: number }
  madePayments.push(payment.id)
  return payment
}

const readEnrollment = (id: number) =>
  payload.findByID({ collection: 'enrollments', id, depth: 0 }) as unknown as Promise<LooseDoc>

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await payload.create({
    collection: 'courses',
    data: { title: 'Course for payment-status derivation int test', courseType: 'OFFLINE' },
  } as Parameters<Payload['create']>[0])
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

describe('enrollment payment status — derived from its payment (FR-032)', () => {
  it('stays UNPAID when the enrollment has no payment', async () => {
    const enrollment = await createEnrollment()
    expect((await readEnrollment(enrollment.id)).paymentStatus).toBe('UNPAID')
  })

  it('becomes PAID once any payment is recorded', async () => {
    const enrollment = await createEnrollment()
    await createPayment(enrollment.id, 500000)

    expect((await readEnrollment(enrollment.id)).paymentStatus).toBe('PAID')
  })

  it('reverts to UNPAID when the payment is deleted', async () => {
    const enrollment = await createEnrollment()
    const payment = await createPayment(enrollment.id, 1000000)
    expect((await readEnrollment(enrollment.id)).paymentStatus).toBe('PAID')

    await payload.delete({ collection: 'payments', id: payment.id })
    madePayments.splice(madePayments.indexOf(payment.id), 1)

    expect((await readEnrollment(enrollment.id)).paymentStatus).toBe('UNPAID')
  })

  it('overrides a manually supplied paymentStatus with the derived value (FR-032)', async () => {
    const enrollment = await createEnrollment()

    const updated = (await payload.update({
      collection: 'enrollments',
      id: enrollment.id,
      data: { paymentStatus: 'PAID' },
    } as Parameters<Payload['update']>[0])) as unknown as LooseDoc

    expect(updated.paymentStatus).toBe('UNPAID')
  })
})
