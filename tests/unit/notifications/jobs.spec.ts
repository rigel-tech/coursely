import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as emailSend from '@/email/send'
import { runClassNotification } from '@/notifications/class-lifecycle'
import { runEnrollmentNotification } from '@/notifications/enrollment'
import { runPaymentNotification } from '@/notifications/payment-recorded'
import type { Class, Enrollment, Payment } from '@/payload-types'
import { asPayload } from '../helpers/payload-stub'

vi.mock('@/email/send', () => ({
  sendEnrollmentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendEnrollmentCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendEnrollmentConfirmedEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminEnrollmentCreatedEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminEnrollmentCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendClassAssignedEmail: vi.fn().mockResolvedValue(undefined),
  sendClassCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendClassRescheduledEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentRecordedEmail: vi.fn().mockResolvedValue(undefined),
}))

const TIMESTAMP = '2026-09-01T00:00:00.000Z'

const enrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  id: 41,
  student: 7,
  course: 12,
  class: null,
  enrollmentStatus: 'NEW',
  paymentStatus: 'UNPAID',
  registrationSource: 'SELF_REGISTRATION',
  registeredAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  createdAt: TIMESTAMP,
  ...overrides,
})

const classDoc = (overrides: Partial<Class> = {}): Class => ({
  id: 5,
  code: 'REACT-01',
  course: 12,
  status: 'OPEN',
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: null,
  scheduleTime: 'Tối 2-4-6',
  location: 'Phòng 101',
  maxStudents: 30,
  updatedAt: TIMESTAMP,
  createdAt: TIMESTAMP,
  ...overrides,
})

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 88,
  enrollmentId: 41,
  studentId: 7,
  amount: 3_000_000,
  paymentMethod: 'BANK_TRANSFER',
  paymentDate: TIMESTAMP,
  referenceNote: 'REF88',
  updatedAt: TIMESTAMP,
  createdAt: TIMESTAMP,
  ...overrides,
})

// The student as the database holds them when the job runs — the name was written after
// the enrollment's save, which is exactly what a job reading at run time must pick up.
const student = { id: 7, email: 'student@example.com', fullName: 'Tên vừa nhập' }
const course = { id: 12, title: 'React Pro' }

function stubPayload(
  docs: Partial<Record<'enrollments' | 'students' | 'courses' | 'classes' | 'payments', unknown>>,
  {
    enrollments = [] as unknown[],
    users = [] as { email: string }[],
  }: { enrollments?: unknown[]; users?: { email: string }[] } = {},
) {
  const create = vi.fn().mockResolvedValue({ id: 1 })
  const findByID = vi.fn(({ collection }: { collection: keyof typeof docs }) =>
    Promise.resolve(docs[collection] ?? null),
  )
  const find = vi.fn(({ collection }: { collection: string }) =>
    Promise.resolve({ docs: collection === 'users' ? users : enrollments }),
  )
  const logger = { error: vi.fn() }

  return { payload: asPayload({ create, findByID, find, logger }), create, find, logger }
}

const notificationWrite = (data: Record<string, unknown>) =>
  expect.objectContaining({ collection: 'notifications', data: expect.objectContaining(data) })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runEnrollmentNotification', () => {
  it('sends the student side, then the staff side, naming the student as they stand now', async () => {
    const stub = stubPayload(
      { enrollments: enrollment(), students: student, courses: course },
      { users: [{ email: 'admin1@coursely.com' }, { email: 'admin2@coursely.com' }] },
    )

    await runEnrollmentNotification(stub.payload, {
      enrollmentId: 41,
      event: 'ENROLLMENT_CREATED',
      notifyStaff: true,
    })

    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({ student: 7, type: 'ENROLLMENT_CREATED', metadata: { course: 12 } }),
    )
    expect(emailSend.sendEnrollmentConfirmationEmail).toHaveBeenCalledWith(stub.payload, {
      to: 'student@example.com',
      courseTitle: 'React Pro',
    })
    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({
        type: 'ENROLLMENT_CREATED',
        content: expect.stringContaining('Tên vừa nhập'),
        metadata: { course: 12, student: 7 },
      }),
    )
    for (const to of ['admin1@coursely.com', 'admin2@coursely.com']) {
      expect(emailSend.sendAdminEnrollmentCreatedEmail).toHaveBeenCalledWith(stub.payload, {
        to,
        studentNameOrEmail: 'Tên vừa nhập',
        courseTitle: 'React Pro',
      })
    }
  })

  it('leaves the staff side out when notifyStaff is off', async () => {
    const stub = stubPayload(
      { enrollments: enrollment(), students: student, courses: course },
      { users: [{ email: 'admin1@coursely.com' }] },
    )

    await runEnrollmentNotification(stub.payload, {
      enrollmentId: 41,
      event: 'ENROLLMENT_CANCELLED',
      notifyStaff: false,
    })

    expect(stub.create).toHaveBeenCalledTimes(1)
    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({ student: 7, type: 'ENROLLMENT_CANCELLED' }),
    )
    expect(emailSend.sendEnrollmentCancellationEmail).toHaveBeenCalledTimes(1)
    expect(emailSend.sendAdminEnrollmentCancelledEmail).not.toHaveBeenCalled()
  })

  it('skips an enrollment deleted before the job ran, and sends for one that still exists', async () => {
    const gone = stubPayload({ students: student, courses: course })
    await expect(
      runEnrollmentNotification(gone.payload, {
        enrollmentId: 41,
        event: 'ENROLLMENT_CONFIRMED',
        notifyStaff: false,
      }),
    ).resolves.toBeUndefined()
    expect(gone.create).not.toHaveBeenCalled()
    expect(emailSend.sendEnrollmentConfirmedEmail).not.toHaveBeenCalled()

    const present = stubPayload({ enrollments: enrollment(), students: student, courses: course })
    await runEnrollmentNotification(present.payload, {
      enrollmentId: 41,
      event: 'ENROLLMENT_CONFIRMED',
      notifyStaff: false,
    })
    expect(emailSend.sendEnrollmentConfirmedEmail).toHaveBeenCalledTimes(1)
  })

  it("sends CLASS_ASSIGNED with the schedule of the enrollment's class", async () => {
    const stub = stubPayload({
      enrollments: enrollment({ class: 5 }),
      students: student,
      courses: course,
      classes: classDoc(),
    })

    await runEnrollmentNotification(stub.payload, {
      enrollmentId: 41,
      event: 'CLASS_ASSIGNED',
      notifyStaff: false,
    })

    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({ student: 7, type: 'CLASS_ASSIGNED', metadata: { course: 12, class: 5 } }),
    )
    expect(emailSend.sendClassAssignedEmail).toHaveBeenCalledWith(
      stub.payload,
      expect.objectContaining({
        to: 'student@example.com',
        studentNameOrEmail: 'Tên vừa nhập',
        classCode: 'REACT-01',
        location: 'Phòng 101',
      }),
    )
  })
})

describe('runClassNotification', () => {
  const populated = (id: number) => ({
    student: { id, email: `s${id}@test.com`, fullName: `HS ${id}` },
  })

  it("asks only for the class's NEW, CONFIRMED and ATTENDED enrollments", async () => {
    const stub = stubPayload(
      { classes: classDoc(), courses: course },
      { enrollments: [populated(1)] },
    )

    await runClassNotification(stub.payload, { classId: 5, event: 'CLASS_CANCELLED' })

    expect(stub.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'enrollments',
        where: {
          and: [
            { class: { equals: 5 } },
            { enrollmentStatus: { in: ['NEW', 'CONFIRMED', 'ATTENDED'] } },
          ],
        },
      }),
    )
  })

  it('notifies each populated student and skips one that came back as a bare id', async () => {
    const stub = stubPayload(
      { classes: classDoc(), courses: course },
      { enrollments: [populated(1), { student: 2 }, populated(3)] },
    )

    await runClassNotification(stub.payload, { classId: 5, event: 'CLASS_CANCELLED' })

    expect(stub.create).toHaveBeenCalledTimes(2)
    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({ student: 1, type: 'CLASS_CANCELLED' }),
    )
    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({ student: 3, type: 'CLASS_CANCELLED' }),
    )
    expect(emailSend.sendClassCancelledEmail).toHaveBeenCalledTimes(2)
  })

  it('sends to one student at a time', async () => {
    let releaseFirst: (value: unknown) => void = () => {}
    const stub = stubPayload(
      { classes: classDoc(), courses: course },
      { enrollments: [populated(1), populated(2)] },
    )
    stub.create.mockImplementationOnce(() => new Promise((resolve) => (releaseFirst = resolve)))

    const running = runClassNotification(stub.payload, { classId: 5, event: 'CLASS_RESCHEDULED' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(stub.create).toHaveBeenCalledTimes(1)
    expect(emailSend.sendClassRescheduledEmail).not.toHaveBeenCalled()

    releaseFirst({ id: 1 })
    await running
    expect(stub.create).toHaveBeenCalledTimes(2)
    expect(emailSend.sendClassRescheduledEmail).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['CLASS_ASSIGNED', emailSend.sendClassAssignedEmail],
    ['CLASS_RESCHEDULED', emailSend.sendClassRescheduledEmail],
    ['CLASS_CANCELLED', emailSend.sendClassCancelledEmail],
  ] as const)('sends %s with its own email', async (event, send) => {
    const stub = stubPayload(
      { classes: classDoc(), courses: course },
      { enrollments: [populated(1)] },
    )

    await runClassNotification(stub.payload, { classId: 5, event })

    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({ student: 1, type: event, metadata: { course: 12, class: 5 } }),
    )
    expect(send).toHaveBeenCalledWith(
      stub.payload,
      expect.objectContaining({ to: 's1@test.com', classCode: 'REACT-01' }),
    )
  })

  it('skips a class deleted before the job ran, and sends for one that still exists', async () => {
    const gone = stubPayload({ courses: course }, { enrollments: [populated(1)] })
    await expect(
      runClassNotification(gone.payload, { classId: 5, event: 'CLASS_CANCELLED' }),
    ).resolves.toBeUndefined()
    expect(gone.create).not.toHaveBeenCalled()

    const present = stubPayload(
      { classes: classDoc(), courses: course },
      { enrollments: [populated(1)] },
    )
    await runClassNotification(present.payload, { classId: 5, event: 'CLASS_CANCELLED' })
    expect(present.create).toHaveBeenCalledTimes(1)
  })
})

describe('runPaymentNotification', () => {
  it("sends the receipt, with the course taken from the payment's enrollment", async () => {
    const stub = stubPayload({
      payments: payment(),
      students: student,
      enrollments: { ...enrollment(), course },
    })

    await runPaymentNotification(stub.payload, { paymentId: 88 })

    expect(stub.create).toHaveBeenCalledWith(
      notificationWrite({
        student: 7,
        type: 'PAYMENT_RECORDED',
        metadata: { course: 12, payment: 88 },
      }),
    )
    expect(emailSend.sendPaymentRecordedEmail).toHaveBeenCalledWith(
      stub.payload,
      expect.objectContaining({
        to: 'student@example.com',
        courseTitle: 'React Pro',
        amount: 3_000_000,
        paymentMethod: 'BANK_TRANSFER',
      }),
    )
  })

  it('sends nothing unless the payment and a populated course are both there', async () => {
    const unpopulated = stubPayload({
      payments: payment(),
      students: student,
      enrollments: enrollment({ course: 12 }),
    })
    await expect(runPaymentNotification(unpopulated.payload, { paymentId: 88 })).resolves.toBe(
      undefined,
    )
    const gone = stubPayload({ students: student, enrollments: enrollment() })
    await runPaymentNotification(gone.payload, { paymentId: 88 })

    expect(unpopulated.create).not.toHaveBeenCalled()
    expect(gone.create).not.toHaveBeenCalled()
    expect(emailSend.sendPaymentRecordedEmail).not.toHaveBeenCalled()

    const complete = stubPayload({
      payments: payment(),
      students: student,
      enrollments: { ...enrollment(), course },
    })
    await runPaymentNotification(complete.payload, { paymentId: 88 })
    expect(emailSend.sendPaymentRecordedEmail).toHaveBeenCalledTimes(1)
  })
})

describe('a failed send', () => {
  it('is logged, the next step still runs, and the job does not throw', async () => {
    const stub = stubPayload(
      { enrollments: enrollment(), students: student, courses: course },
      { users: [{ email: 'admin1@coursely.com' }] },
    )
    stub.create.mockRejectedValueOnce(new Error('notifications insert failed'))
    vi.mocked(emailSend.sendEnrollmentConfirmationEmail).mockRejectedValueOnce(
      new Error('smtp down'),
    )

    await expect(
      runEnrollmentNotification(stub.payload, {
        enrollmentId: 41,
        event: 'ENROLLMENT_CREATED',
        notifyStaff: true,
      }),
    ).resolves.toBeUndefined()

    expect(stub.logger.error).toHaveBeenCalledTimes(2)
    expect(stub.logger.error).toHaveBeenCalledWith(
      { err: expect.objectContaining({ message: 'notifications insert failed' }) },
      expect.any(String),
    )
    expect(stub.logger.error).toHaveBeenCalledWith(
      { err: expect.objectContaining({ message: 'smtp down' }) },
      expect.any(String),
    )
    expect(emailSend.sendAdminEnrollmentCreatedEmail).toHaveBeenCalledTimes(1)
  })
})
