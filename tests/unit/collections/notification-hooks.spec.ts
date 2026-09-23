import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest, SanitizedCollectionConfig } from 'payload'

import * as emailSend from '@/email/send'
import { notifyOnClassChange } from '@/collections/Classes/hooks/notifyOnClassChange'
import { notifyOnStatusChange } from '@/collections/Enrollments/hooks/notifyOnStatusChange'
import { notifyOnPaymentRecorded } from '@/collections/Payments/hooks/notifyOnPaymentRecorded'
import type { Class, Enrollment, Payment } from '@/payload-types'
import { asRequest } from '../helpers/payload-stub'

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
  endDate: '2026-12-01T00:00:00.000Z',
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
  updatedAt: TIMESTAMP,
  createdAt: TIMESTAMP,
  ...overrides,
})

/**
 * Serves every lookup the hooks under test might make, with enough real-looking data that
 * code which sends a notification actually gets as far as sending it — so a "sends
 * nothing" assertion fails against code that does send.
 */
function stubRequest({
  staff = false,
  classStatus = 'OPEN',
}: { staff?: boolean; classStatus?: Class['status'] } = {}) {
  const queue = vi.fn().mockResolvedValue({ id: 1 })
  const create = vi.fn().mockResolvedValue({ id: 1 })
  const student = { id: 7, email: 'student@example.com', fullName: 'Nguyễn Văn A' }
  const course = { id: 12, title: 'React Pro' }
  const lookups: Record<string, unknown> = {
    students: student,
    courses: course,
    classes: classDoc({ status: classStatus }),
    enrollments: enrollment(),
  }
  const payload = {
    jobs: { queue },
    create,
    findByID: vi.fn(({ collection }: { collection: string }) =>
      Promise.resolve(lookups[collection] ?? null),
    ),
    find: vi.fn().mockResolvedValue({ docs: [{ id: 41, student }] }),
    logger: { error: vi.fn() },
  }
  const req = asRequest({
    payload,
    user: staff ? { id: 1, collection: 'users' } : undefined,
    context: {},
  })

  return { queue, create, req }
}

function afterChangeArgs<T>({
  doc,
  previousDoc,
  operation,
  req,
}: {
  doc: T
  previousDoc?: T
  operation: 'create' | 'update'
  req: PayloadRequest
}) {
  return {
    collection: {} as SanitizedCollectionConfig,
    context: {},
    data: doc,
    doc,
    // Payload passes `{}` here on create, whatever the declared type says.
    previousDoc: previousDoc ?? ({} as T),
    operation,
    req,
  }
}

// A "sends nothing" assertion has to catch work a hook fires without awaiting as well;
// every stub resolves as a microtask, so one macrotask turn drains all of it.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

async function expectNothingSent({ queue, create }: ReturnType<typeof stubRequest>) {
  await settle()
  expect(queue).not.toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
  for (const send of Object.values(emailSend)) expect(send).not.toHaveBeenCalled()
}

const enrollmentJob = (
  req: PayloadRequest,
  input: { event: string; notifyStaff: boolean; enrollmentId?: number },
) => ({
  task: 'notifyEnrollmentEvent',
  queue: 'notifications',
  input: { enrollmentId: 41, ...input },
  req,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Enrollments notifyOnStatusChange — created and cancelled', () => {
  it('queues ENROLLMENT_CREATED for a self-registration, staff included, on the operation req', async () => {
    const stub = stubRequest()

    await notifyOnStatusChange(
      afterChangeArgs({ doc: enrollment(), operation: 'create', req: stub.req }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith(
      enrollmentJob(stub.req, { event: 'ENROLLMENT_CREATED', notifyStaff: true }),
    )
  })

  it('leaves staff out of an ENROLLMENT_CREATED that a staff member made', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ registrationSource: 'ADMIN_CREATED' }),
        operation: 'create',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledWith(
      enrollmentJob(stub.req, { event: 'ENROLLMENT_CREATED', notifyStaff: false }),
    )
  })

  it('queues ENROLLMENT_CANCELLED once, on the transition into CANCELLED only', async () => {
    const stub = stubRequest()

    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CANCELLED' }),
        previousDoc: enrollment({ enrollmentStatus: 'CONFIRMED' }),
        operation: 'update',
        req: stub.req,
      }),
    )
    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CANCELLED' }),
        previousDoc: enrollment({ enrollmentStatus: 'CANCELLED' }),
        operation: 'update',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith(
      enrollmentJob(stub.req, { event: 'ENROLLMENT_CANCELLED', notifyStaff: true }),
    )
  })

  it('leaves staff out of an ENROLLMENT_CANCELLED that a staff member made', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CANCELLED' }),
        previousDoc: enrollment({ enrollmentStatus: 'NEW' }),
        operation: 'update',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledWith(
      enrollmentJob(stub.req, { event: 'ENROLLMENT_CANCELLED', notifyStaff: false }),
    )
  })
})

describe('Enrollments notifyOnStatusChange — confirmed', () => {
  it('queues ENROLLMENT_CONFIRMED on NEW → CONFIRMED', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CONFIRMED' }),
        previousDoc: enrollment({ enrollmentStatus: 'NEW' }),
        operation: 'update',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith(
      enrollmentJob(stub.req, { event: 'ENROLLMENT_CONFIRMED', notifyStaff: false }),
    )
  })

  it('queues ENROLLMENT_CONFIRMED instead of ENROLLMENT_CREATED for one created already confirmed', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CONFIRMED', registrationSource: 'ADMIN_CREATED' }),
        operation: 'create',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith(
      enrollmentJob(stub.req, { event: 'ENROLLMENT_CONFIRMED', notifyStaff: false }),
    )
  })

  it.each(['ATTENDED', 'CANCELLED'] as const)(
    'sends no confirmation when a %s enrollment moves back to CONFIRMED',
    async (from) => {
      const stub = stubRequest({ staff: true })

      await notifyOnStatusChange(
        afterChangeArgs({
          doc: enrollment({ enrollmentStatus: 'CONFIRMED' }),
          previousDoc: enrollment({ enrollmentStatus: from }),
          operation: 'update',
          req: stub.req,
        }),
      )

      await expectNothingSent(stub)
    },
  )
})

describe('Enrollments notifyOnStatusChange — class assigned', () => {
  it.each(['NEW', 'CONFIRMED', 'ATTENDED'] as const)(
    'queues CLASS_ASSIGNED when a %s enrollment is given a class',
    async (status) => {
      const stub = stubRequest({ staff: true })

      await notifyOnStatusChange(
        afterChangeArgs({
          doc: enrollment({ enrollmentStatus: status, class: 5 }),
          previousDoc: enrollment({ enrollmentStatus: status, class: null }),
          operation: 'update',
          req: stub.req,
        }),
      )

      expect(stub.queue).toHaveBeenCalledTimes(1)
      expect(stub.queue).toHaveBeenCalledWith(
        enrollmentJob(stub.req, { event: 'CLASS_ASSIGNED', notifyStaff: false }),
      )
    },
  )

  it('queues CLASS_ASSIGNED only when the class actually changes', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CONFIRMED', class: 5 }),
        previousDoc: enrollment({ enrollmentStatus: 'CONFIRMED', class: 5 }),
        operation: 'update',
        req: stub.req,
      }),
    )
    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CONFIRMED', class: 6 }),
        previousDoc: enrollment({ enrollmentStatus: 'CONFIRMED', class: 5 }),
        operation: 'update',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith(
      enrollmentJob(stub.req, { event: 'CLASS_ASSIGNED', notifyStaff: false }),
    )
  })

  it.each(['CANCELLED', 'COMPLETED'] as const)(
    'sends nothing when a %s enrollment is given a class',
    async (status) => {
      const stub = stubRequest({ staff: true })

      await notifyOnStatusChange(
        afterChangeArgs({
          doc: enrollment({ enrollmentStatus: status, class: 5 }),
          previousDoc: enrollment({ enrollmentStatus: status, class: null }),
          operation: 'update',
          req: stub.req,
        }),
      )

      await expectNothingSent(stub)
    },
  )

  it('sends nothing while the assigned class is still a DRAFT', async () => {
    const stub = stubRequest({ staff: true, classStatus: 'DRAFT' })

    await notifyOnStatusChange(
      afterChangeArgs({
        doc: enrollment({ enrollmentStatus: 'CONFIRMED', class: 5 }),
        previousDoc: enrollment({ enrollmentStatus: 'CONFIRMED', class: null }),
        operation: 'update',
        req: stub.req,
      }),
    )

    await expectNothingSent(stub)
  })
})

const classJob = (req: PayloadRequest, event: string) => ({
  task: 'notifyClassEvent',
  queue: 'notifications',
  input: { classId: 5, event },
  req,
})

describe('Classes notifyOnClassChange — cancelled', () => {
  it.each(['OPEN', 'CLOSED'] as const)(
    'queues CLASS_CANCELLED on the operation req when a %s class is cancelled, once',
    async (from) => {
      const stub = stubRequest({ staff: true })

      await notifyOnClassChange(
        afterChangeArgs({
          doc: classDoc({ status: 'CANCELLED' }),
          previousDoc: classDoc({ status: from }),
          operation: 'update',
          req: stub.req,
        }),
      )
      await notifyOnClassChange(
        afterChangeArgs({
          doc: classDoc({ status: 'CANCELLED' }),
          previousDoc: classDoc({ status: 'CANCELLED' }),
          operation: 'update',
          req: stub.req,
        }),
      )

      expect(stub.queue).toHaveBeenCalledTimes(1)
      expect(stub.queue).toHaveBeenCalledWith(classJob(stub.req, 'CLASS_CANCELLED'))
    },
  )

  it('sends nothing when a DRAFT class is cancelled', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnClassChange(
      afterChangeArgs({
        doc: classDoc({ status: 'CANCELLED' }),
        previousDoc: classDoc({ status: 'DRAFT' }),
        operation: 'update',
        req: stub.req,
      }),
    )

    await expectNothingSent(stub)
  })
})

describe('Classes notifyOnClassChange — rescheduled', () => {
  it.each([
    { startDate: '2026-10-08T00:00:00.000Z' },
    { endDate: '2026-12-15T00:00:00.000Z' },
    { scheduleTime: 'Sáng 7-CN' },
    { location: 'Phòng 202' },
  ] satisfies Partial<Class>[])('queues CLASS_RESCHEDULED when %o changes', async (change) => {
    const stub = stubRequest({ staff: true })

    await notifyOnClassChange(
      afterChangeArgs({
        doc: classDoc(change),
        previousDoc: classDoc(),
        operation: 'update',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith(classJob(stub.req, 'CLASS_RESCHEDULED'))
  })

  it('queues CLASS_RESCHEDULED only for a schedule field, and never on create', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnClassChange(
      afterChangeArgs({ doc: classDoc(), operation: 'create', req: stub.req }),
    )
    await notifyOnClassChange(
      afterChangeArgs({
        doc: classDoc({ maxStudents: 40 }),
        previousDoc: classDoc(),
        operation: 'update',
        req: stub.req,
      }),
    )
    await notifyOnClassChange(
      afterChangeArgs({
        doc: classDoc({ location: 'Phòng 202' }),
        previousDoc: classDoc(),
        operation: 'update',
        req: stub.req,
      }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith(classJob(stub.req, 'CLASS_RESCHEDULED'))
  })

  it('sends nothing when a DRAFT class is rescheduled', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnClassChange(
      afterChangeArgs({
        doc: classDoc({ status: 'DRAFT', location: 'Phòng 202' }),
        previousDoc: classDoc({ status: 'DRAFT' }),
        operation: 'update',
        req: stub.req,
      }),
    )

    await expectNothingSent(stub)
  })
})

describe('Classes notifyOnClassChange — a DRAFT class opens', () => {
  it.each(['OPEN', 'CLOSED'] as const)(
    'queues CLASS_ASSIGNED for the whole class when a DRAFT class becomes %s',
    async (to) => {
      const stub = stubRequest({ staff: true })

      await notifyOnClassChange(
        afterChangeArgs({
          doc: classDoc({ status: to }),
          previousDoc: classDoc({ status: 'DRAFT' }),
          operation: 'update',
          req: stub.req,
        }),
      )

      expect(stub.queue).toHaveBeenCalledTimes(1)
      expect(stub.queue).toHaveBeenCalledWith(classJob(stub.req, 'CLASS_ASSIGNED'))
    },
  )
})

describe('Payments notifyOnPaymentRecorded', () => {
  it('queues the receipt on the operation req when a payment is created, and nothing on update', async () => {
    const stub = stubRequest({ staff: true })

    await notifyOnPaymentRecorded(
      afterChangeArgs({
        doc: payment({ referenceNote: 'sửa ghi chú' }),
        previousDoc: payment(),
        operation: 'update',
        req: stub.req,
      }),
    )
    await notifyOnPaymentRecorded(
      afterChangeArgs({ doc: payment(), operation: 'create', req: stub.req }),
    )

    expect(stub.queue).toHaveBeenCalledTimes(1)
    expect(stub.queue).toHaveBeenCalledWith({
      task: 'notifyPaymentRecorded',
      queue: 'notifications',
      input: { paymentId: 88 },
      req: stub.req,
    })
  })
})
