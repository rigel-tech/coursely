// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

let payload: Payload
let staffUserId: number
let studentId: number
let studentOtherId: number
let mediaId: number
let courseId: number
let enrollmentId: number
const madePayments: number[] = []
const madeStaff: number[] = []
const madeStudents: number[] = []
const madeMedia: number[] = []

const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

type LooseData = Record<string, unknown>
type LooseDoc = Record<string, unknown> & { id: number }

const relId = (v: unknown): unknown => (v && typeof v === 'object' ? (v as { id: unknown }).id : v)

const createPayment = (data: LooseData) =>
  payload.create({ collection: 'payments', data } as Parameters<
    Payload['create']
  >[0]) as unknown as Promise<LooseDoc>

const createPaymentAs = (user: unknown, data: LooseData) =>
  payload.create({
    collection: 'payments',
    data,
    user,
    overrideAccess: false,
  } as Parameters<Payload['create']>[0]) as unknown as Promise<LooseDoc>

// 1x1 transparent PNG — smallest valid file the `media` upload collection will accept.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })

  const staff = await payload.create({
    collection: 'users',
    data: { email: uniqueEmail('pay-staff'), password: 'Secret123' },
  })
  staffUserId = staff.id as number
  madeStaff.push(staffUserId)

  const student = await payload.create({
    collection: 'students',
    data: {
      email: uniqueEmail('pay-student'),
      password: 'Secret123',
      status: 'ACTIVE',
      fullName: 'Nguyễn Văn A',
    },
  })
  studentId = student.id as number
  madeStudents.push(studentId)

  const studentOther = await payload.create({
    collection: 'students',
    data: {
      email: uniqueEmail('pay-student-other'),
      password: 'Secret123',
      status: 'ACTIVE',
      fullName: 'Trần Thị B',
    },
  })
  studentOtherId = studentOther.id as number
  madeStudents.push(studentOtherId)

  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Ảnh bằng chứng thanh toán' },
    file: {
      data: Buffer.from(TINY_PNG_BASE64, 'base64'),
      mimetype: 'image/png',
      name: 'proof.png',
      size: Buffer.from(TINY_PNG_BASE64, 'base64').length,
    },
  })
  mediaId = media.id as number
  madeMedia.push(mediaId)

  const course = await payload.create({
    collection: 'courses',
    data: { title: 'Course for payments int test', courseType: 'OFFLINE' },
  } as Parameters<Payload['create']>[0])
  courseId = course.id as number

  const enrollment = await payload.create({
    collection: 'enrollments',
    data: { student: studentId, course: courseId },
  } as Parameters<Payload['create']>[0])
  enrollmentId = enrollment.id as number
})

afterAll(async () => {
  for (const id of madePayments.splice(0)) {
    await payload.delete({ collection: 'payments', id }).catch(() => {})
  }
  await payload.delete({ collection: 'enrollments', id: enrollmentId }).catch(() => {})
  await payload.delete({ collection: 'courses', id: courseId }).catch(() => {})
  for (const id of madeStaff) await payload.delete({ collection: 'users', id }).catch(() => {})
  for (const id of madeStudents)
    await payload.delete({ collection: 'students', id }).catch(() => {})
  for (const id of madeMedia) await payload.delete({ collection: 'media', id }).catch(() => {})
})

const baseData = (): LooseData => ({
  enrollmentId,
  studentId,
  amount: 500000,
  paymentMethod: 'CASH',
})

describe('payments collection — required fields', () => {
  it('creates a payment with all required fields', async () => {
    const doc = await createPayment(baseData())
    madePayments.push(doc.id)

    expect(doc.amount).toBe(500000)
    expect(doc.paymentMethod).toBe('CASH')
    expect(doc.createdAt).toBeTruthy()
    expect(doc.updatedAt).toBeTruthy()
  })

  it('rejects a create missing any required field that is not auto-derived', async () => {
    for (const key of ['enrollmentId', 'amount', 'paymentMethod']) {
      const data = baseData()
      delete data[key]
      await expect(createPayment(data)).rejects.toThrow()
    }
  })
})

describe('payments collection — amount validation', () => {
  it('rejects amount 0, a negative amount, and a non-integer amount', async () => {
    for (const amount of [0, -100, 1000.5]) {
      await expect(createPayment({ ...baseData(), amount })).rejects.toThrow()
    }
  })

  it('accepts a positive integer amount', async () => {
    const doc = await createPayment({ ...baseData(), amount: 1 })
    madePayments.push(doc.id)
    expect(doc.amount).toBe(1)
  })
})

describe('payments collection — paymentDate is set automatically', () => {
  it('auto-fills paymentDate to the save time when omitted', async () => {
    const before = Date.now()
    const doc = await createPayment(baseData())
    madePayments.push(doc.id)
    const after = Date.now()

    expect(doc.paymentDate).toBeTruthy()
    const savedAt = new Date(doc.paymentDate as string).getTime()
    expect(savedAt).toBeGreaterThanOrEqual(before)
    expect(savedAt).toBeLessThanOrEqual(after)
  })

  it('overrides a manually supplied paymentDate with the save time', async () => {
    const before = Date.now()
    const doc = await createPayment({ ...baseData(), paymentDate: '2020-01-01T00:00:00.000Z' })
    madePayments.push(doc.id)
    const after = Date.now()

    const savedAt = new Date(doc.paymentDate as string).getTime()
    expect(savedAt).toBeGreaterThanOrEqual(before)
    expect(savedAt).toBeLessThanOrEqual(after)
  })
})

describe('payments collection — studentId relationship', () => {
  it('creates a payment whose studentId resolves to the real student', async () => {
    const doc = await createPayment(baseData())
    madePayments.push(doc.id)
    expect(relId(doc.studentId)).toBe(studentId)

    const populated = await payload.findByID({ collection: 'payments', id: doc.id, depth: 1 })
    const populatedStudent = populated.studentId as unknown as { id: number; email: string }
    expect(populatedStudent.id).toBe(studentId)
    expect(populatedStudent.email).toBeTruthy()
  })
})

describe('payments collection — studentId is auto-set from the enrollment, read-only', () => {
  it('auto-fills studentId to the enrollment’s own student when omitted', async () => {
    const data = baseData()
    delete data.studentId
    const doc = await createPayment(data)
    madePayments.push(doc.id)
    expect(relId(doc.studentId)).toBe(studentId)
  })

  it('overrides an explicitly supplied studentId that does not match the enrollment', async () => {
    const doc = await createPayment({ ...baseData(), studentId: studentOtherId })
    madePayments.push(doc.id)
    expect(relId(doc.studentId)).toBe(studentId)
    expect(relId(doc.studentId)).not.toBe(studentOtherId)
  })
})

describe('payments collection — enrollmentId relationship', () => {
  it('creates a payment whose enrollmentId resolves to the real enrollment', async () => {
    const doc = await createPayment(baseData())
    madePayments.push(doc.id)
    expect(relId(doc.enrollmentId)).toBe(enrollmentId)

    const populated = await payload.findByID({ collection: 'payments', id: doc.id, depth: 1 })
    const populatedEnrollment = populated.enrollmentId as unknown as { id: number }
    expect(populatedEnrollment.id).toBe(enrollmentId)
  })

  it('rejects an enrollmentId that does not reference a real enrollment', async () => {
    await expect(createPayment({ ...baseData(), enrollmentId: 999999999 })).rejects.toThrow()
  })
})

describe('payments collection — admin list resolves relations at depth 0', () => {
  it('still returns studentId, userId, and enrollmentId as populated objects when fetched at depth: 0', async () => {
    const staff = await payload.findByID({ collection: 'users', id: staffUserId })
    const doc = await createPaymentAs(staff, baseData())
    madePayments.push(doc.id)

    const listRow = await payload.findByID({ collection: 'payments', id: doc.id, depth: 0 })
    const rowStudent = listRow.studentId as unknown as { id: number; email: string }
    const rowUser = listRow.userId as unknown as { id: number; email: string }
    const rowEnrollment = listRow.enrollmentId as unknown as { id: number }
    expect(rowStudent.id).toBe(studentId)
    expect(rowStudent.email).toBeTruthy()
    expect(rowUser.id).toBe(staffUserId)
    expect(rowUser.email).toBeTruthy()
    expect(rowEnrollment.id).toBe(enrollmentId)
  })
})

describe('payments collection — userId is auto-set to the creator, read-only', () => {
  it('auto-fills userId to the authenticated staff account that created it', async () => {
    const staff = await payload.findByID({ collection: 'users', id: staffUserId })
    const doc = await createPaymentAs(staff, baseData())
    madePayments.push(doc.id)
    expect(relId(doc.userId)).toBe(staffUserId)

    const populated = await payload.findByID({ collection: 'payments', id: doc.id, depth: 1 })
    const populatedUser = populated.userId as unknown as { id: number; email: string }
    expect(populatedUser.id).toBe(staffUserId)
    expect(populatedUser.email).toBeTruthy()
  })

  it('overrides an explicitly supplied userId with the authenticated creator', async () => {
    const staff = await payload.findByID({ collection: 'users', id: staffUserId })
    const doc = await createPaymentAs(staff, { ...baseData(), userId: 999999999 })
    madePayments.push(doc.id)
    expect(relId(doc.userId)).toBe(staffUserId)
  })
})

describe('payments collection — proof of payment image (US2)', () => {
  it('creates a payment with proofImage attached', async () => {
    const doc = await createPayment({ ...baseData(), proofImage: mediaId })
    madePayments.push(doc.id)
    expect(relId(doc.proofImage)).toBe(mediaId)
  })

  it('creates a payment with userId, referenceNote, and proofImage all omitted', async () => {
    const doc = await createPayment(baseData())
    madePayments.push(doc.id)
    expect(doc.id).toBeTruthy()
  })
})

describe('payments collection — access control', () => {
  it('denies read with no user', async () => {
    await expect(payload.find({ collection: 'payments', overrideAccess: false })).rejects.toThrow()
  })

  it('denies read for a student principal', async () => {
    const student = await payload.findByID({ collection: 'students', id: studentId })
    const studentPrincipal = { ...student, collection: 'students' }

    await expect(
      payload.find({ collection: 'payments', overrideAccess: false, user: studentPrincipal }),
    ).rejects.toThrow()
  })

  it('allows read for a staff principal', async () => {
    const staff = await payload.findByID({ collection: 'users', id: staffUserId })
    const res = await payload.find({ collection: 'payments', overrideAccess: false, user: staff })

    expect(Array.isArray(res.docs)).toBe(true)
  })
})
