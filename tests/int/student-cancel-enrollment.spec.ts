// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { cancelStudentEnrollment } from '@/services/student-enrollment'
import {
  EnrollmentAlreadyCancelled,
  EnrollmentAlreadyStarted,
  EnrollmentHasPayment,
  EnrollmentNotCancellable,
  EnrollmentNotFound,
} from '@/lib/errors/enrollment'

let payload: Payload
let courseId: number
let classFutureId: number
let classPastId: number
const madeStudents: number[] = []
const madeEnrollments: number[] = []
const madePayments: number[] = []

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

const makeStudent = async (tag: string) => {
  const student = await createDoc('students', {
    email: uniqueEmail(tag),
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Học viên ' + tag,
  })
  madeStudents.push(student.id)
  return student.id as number
}

const makeEnrollment = async (data: LooseData) => {
  const enrollment = await createDoc('enrollments', data)
  madeEnrollments.push(enrollment.id)
  return enrollment.id as number
}

const waitFor = async (
  check: () => Promise<boolean>,
  { timeoutMs = 3000, intervalMs = 50 } = {},
) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('waitFor: condition never became true')
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await createDoc('courses', {
    title: 'Course for cancel-enrollment int test',
    courseType: 'OFFLINE',
  })
  courseId = course.id as number

  const classFuture = await createDoc('classes', {
    code: `CANCEL-FUTURE-${Date.now()}`,
    course: courseId,
    startDate: '2099-01-01T00:00:00.000Z',
    maxStudents: 20,
  })
  classFutureId = classFuture.id as number

  const classPast = await createDoc('classes', {
    code: `CANCEL-PAST-${Date.now()}`,
    course: courseId,
    startDate: '2000-01-01T00:00:00.000Z',
    maxStudents: 20,
  })
  classPastId = classPast.id as number
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
  await payload.delete({ collection: 'classes', id: classFutureId }).catch(() => {})
  await payload.delete({ collection: 'classes', id: classPastId }).catch(() => {})
  await payload.delete({ collection: 'courses', id: courseId }).catch(() => {})
})

describe('cancelStudentEnrollment — succeeds and marks CANCELLED', () => {
  it('cancels a NEW, unpaid enrollment with no class', async () => {
    const studentId = await makeStudent('new-unpaid')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'NEW',
      paymentStatus: 'UNPAID',
    })

    const before = Date.now()
    await cancelStudentEnrollment(enrollmentId, studentId)
    const after = Date.now()

    const doc = await payload.findByID({ collection: 'enrollments', id: enrollmentId, depth: 0 })
    expect(doc.enrollmentStatus).toBe('CANCELLED')
    expect(doc.cancelledAt).toBeTruthy()
    const cancelledAt = new Date(doc.cancelledAt as string).getTime()
    expect(cancelledAt).toBeGreaterThanOrEqual(before)
    expect(cancelledAt).toBeLessThanOrEqual(after)
  })

  it('cancels a CONFIRMED, unpaid enrollment with no class assigned', async () => {
    const studentId = await makeStudent('confirmed-no-class')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'CONFIRMED',
      paymentStatus: 'UNPAID',
    })

    await cancelStudentEnrollment(enrollmentId, studentId)

    const doc = await payload.findByID({ collection: 'enrollments', id: enrollmentId, depth: 0 })
    expect(doc.enrollmentStatus).toBe('CANCELLED')
  })

  it('cancels a CONFIRMED, unpaid enrollment assigned to a class that has not started', async () => {
    const studentId = await makeStudent('confirmed-future-class')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      class: classFutureId,
      enrollmentStatus: 'CONFIRMED',
      paymentStatus: 'UNPAID',
    })

    await cancelStudentEnrollment(enrollmentId, studentId)

    const doc = await payload.findByID({ collection: 'enrollments', id: enrollmentId, depth: 0 })
    expect(doc.enrollmentStatus).toBe('CANCELLED')
  })
})

describe('cancelStudentEnrollment — refused, enrollment unchanged', () => {
  it('refuses a PAID enrollment', async () => {
    const studentId = await makeStudent('paid')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'CONFIRMED',
    })

    const payment = await payload.create({
      collection: 'payments',
      data: {
        enrollmentId,
        amount: 50000,
        paymentMethod: 'CASH',
      },
    })
    madePayments.push(payment.id as number)

    await expect(cancelStudentEnrollment(enrollmentId, studentId)).rejects.toBeInstanceOf(
      EnrollmentHasPayment,
    )
  })

  it('refuses an ATTENDED enrollment', async () => {
    const studentId = await makeStudent('attended')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'ATTENDED',
      paymentStatus: 'UNPAID',
    })

    await expect(cancelStudentEnrollment(enrollmentId, studentId)).rejects.toBeInstanceOf(
      EnrollmentNotCancellable,
    )
  })

  it('refuses a COMPLETED enrollment', async () => {
    const studentId = await makeStudent('completed')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'COMPLETED',
      paymentStatus: 'UNPAID',
    })

    await expect(cancelStudentEnrollment(enrollmentId, studentId)).rejects.toBeInstanceOf(
      EnrollmentNotCancellable,
    )
  })

  it('refuses an already-CANCELLED enrollment', async () => {
    const studentId = await makeStudent('already-cancelled')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'CANCELLED',
      paymentStatus: 'UNPAID',
    })

    await expect(cancelStudentEnrollment(enrollmentId, studentId)).rejects.toBeInstanceOf(
      EnrollmentAlreadyCancelled,
    )
  })

  it('refuses an enrollment assigned to a class that has already started', async () => {
    const studentId = await makeStudent('class-started')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      class: classPastId,
      enrollmentStatus: 'CONFIRMED',
      paymentStatus: 'UNPAID',
    })

    await expect(cancelStudentEnrollment(enrollmentId, studentId)).rejects.toBeInstanceOf(
      EnrollmentAlreadyStarted,
    )
  })

  it('refuses a student cancelling an enrollment that is not theirs', async () => {
    const ownerId = await makeStudent('owner')
    const otherId = await makeStudent('other')
    const enrollmentId = await makeEnrollment({
      student: ownerId,
      course: courseId,
      enrollmentStatus: 'NEW',
      paymentStatus: 'UNPAID',
    })

    await expect(cancelStudentEnrollment(enrollmentId, otherId)).rejects.toBeInstanceOf(
      EnrollmentNotFound,
    )

    const doc = await payload.findByID({ collection: 'enrollments', id: enrollmentId, depth: 0 })
    expect(doc.enrollmentStatus).toBe('NEW')
  })
})

describe('cancelStudentEnrollment — notification and email (US on cancel)', () => {
  it('creates an ENROLLMENT_CANCELLED notification and sends a confirmation email', async () => {
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    const studentId = await makeStudent('notify')
    const student = await payload.findByID({ collection: 'students', id: studentId })
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'NEW',
      paymentStatus: 'UNPAID',
    })

    await cancelStudentEnrollment(enrollmentId, studentId)

    await waitFor(async () => {
      const found = await payload.find({
        collection: 'notifications',
        where: {
          and: [{ student: { equals: studentId } }, { type: { equals: 'ENROLLMENT_CANCELLED' } }],
        },
      })
      return found.docs.length > 0
    })

    await waitFor(async () => sendEmail.mock.calls.length > 0)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: student.email }))
    sendEmail.mockRestore()
  })
})

describe('cancelStudentEnrollment — double-cancel race', () => {
  it('the second call sees CANCELLED and is refused, not double-processed', async () => {
    const studentId = await makeStudent('double-cancel')
    const enrollmentId = await makeEnrollment({
      student: studentId,
      course: courseId,
      enrollmentStatus: 'NEW',
      paymentStatus: 'UNPAID',
    })

    await cancelStudentEnrollment(enrollmentId, studentId)
    await expect(cancelStudentEnrollment(enrollmentId, studentId)).rejects.toBeInstanceOf(
      EnrollmentAlreadyCancelled,
    )
  })
})
