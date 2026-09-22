// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import configPromise from '@payload-config'

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

const makeStudent = async () => {
  const email = uniqueEmail('notify')
  const student = await createDoc('students', {
    email,
    password: 'Secret123',
    status: 'ACTIVE',
    fullName: 'Học viên thông báo',
  })
  madeStudents.push(student.id)
  return { id: student.id, email }
}

const makeClass = async () => {
  const created = await createDoc('classes', {
    code: `NOTIFY-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    course: courseId,
    startDate: '2099-01-01T00:00:00.000Z',
    maxStudents: 10,
    status: 'OPEN',
  })
  madeClasses.push(created.id)
  return created.id
}

const makeEnrollment = async (studentId: number, overrides: LooseData = {}) => {
  const enrollment = await createDoc('enrollments', {
    student: studentId,
    course: courseId,
    enrollmentStatus: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    ...overrides,
  })
  madeEnrollments.push(enrollment.id)
  return enrollment.id
}

const inputOf = (job: { input?: unknown }): Record<string, unknown> =>
  job.input && typeof job.input === 'object' && !Array.isArray(job.input)
    ? (job.input as Record<string, unknown>)
    : {}

// Filtered here rather than in `where`, so the query never names a task slug the schema
// might not know.
const findJobs = async (task: string, matches: (input: Record<string, unknown>) => boolean) => {
  const { docs } = await payload.find({
    collection: 'payload-jobs',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return docs.filter((job) => job.taskSlug === task && matches(inputOf(job)))
}

const notificationTypesFor = async (studentId: number) => {
  const { docs } = await payload.find({
    collection: 'notifications',
    where: { student: { equals: studentId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return docs.map((doc) => doc.type)
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const course = await createDoc('courses', {
    title: 'Course for notification-jobs int test',
    courseType: 'OFFLINE',
  })
  courseId = course.id
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  // A leftover notification outlives its student as `student = NULL` (drizzle-push FKs are
  // `SET NULL`), which the admin bell then shows every staff member — delete them first.
  await payload
    .delete({
      collection: 'notifications',
      where: { student: { in: madeStudents } },
      overrideAccess: true,
    })
    .catch(() => {})

  const { docs: jobs } = await payload.find({
    collection: 'payload-jobs',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  for (const job of jobs) {
    const input = inputOf(job)
    const ours =
      madeEnrollments.includes(input.enrollmentId as number) ||
      madeClasses.includes(input.classId as number)
    if (ours) await payload.delete({ collection: 'payload-jobs', id: job.id }).catch(() => {})
  }

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

describe('a notification is queued inside the transaction of the write that raises it', () => {
  it('leaves no job behind a rolled-back class assignment, and exactly one behind a committed one', async () => {
    const classId = await makeClass()
    const rolledBack = await makeEnrollment((await makeStudent()).id)
    const committed = await makeEnrollment((await makeStudent()).id)

    const assignInTransaction = async (enrollmentId: number, outcome: 'commit' | 'rollback') => {
      const transactionID = (await payload.db.beginTransaction()) ?? undefined
      const req = { payload, transactionID } as PayloadRequest
      await payload.update({
        collection: 'enrollments',
        id: enrollmentId,
        data: { class: classId },
        overrideAccess: true,
        req,
      })
      if (!transactionID) return
      if (outcome === 'commit') await payload.db.commitTransaction(transactionID)
      else await payload.db.rollbackTransaction(transactionID)
    }

    await assignInTransaction(rolledBack, 'rollback')
    await assignInTransaction(committed, 'commit')

    const assignedJobs = (enrollmentId: number) =>
      findJobs(
        'notifyEnrollmentEvent',
        (input) => input.enrollmentId === enrollmentId && input.event === 'CLASS_ASSIGNED',
      )
    expect(await assignedJobs(rolledBack)).toHaveLength(0)
    expect(await assignedJobs(committed)).toHaveLength(1)
  })
})

describe('the notifyClassEvent job', () => {
  it('tells the NEW and CONFIRMED students of a cancelled class, and not the CANCELLED one', async () => {
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const classId = await makeClass()
    const [fresh, confirmed, dropped] = await Promise.all([
      makeStudent(),
      makeStudent(),
      makeStudent(),
    ])
    await makeEnrollment(fresh.id, { enrollmentStatus: 'NEW', class: classId })
    await makeEnrollment(confirmed.id, { class: classId })
    await makeEnrollment(dropped.id, { enrollmentStatus: 'CANCELLED', class: classId })

    await payload.update({
      collection: 'classes',
      id: classId,
      data: { status: 'CANCELLED' },
      overrideAccess: true,
    })

    const [job] = await findJobs(
      'notifyClassEvent',
      (input) => input.classId === classId && input.event === 'CLASS_CANCELLED',
    )
    expect(job).toBeDefined()
    await payload.jobs.runByID({ id: job.id })

    expect(await notificationTypesFor(fresh.id)).toContain('CLASS_CANCELLED')
    expect(await notificationTypesFor(confirmed.id)).toContain('CLASS_CANCELLED')
    expect(await notificationTypesFor(dropped.id)).not.toContain('CLASS_CANCELLED')
    const recipients = sendEmail.mock.calls.map(([message]) => message.to)
    expect(recipients).toEqual(expect.arrayContaining([fresh.email, confirmed.email]))
    expect(recipients).not.toContain(dropped.email)
  })
})
