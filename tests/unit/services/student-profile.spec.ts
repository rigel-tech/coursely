import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { updateStudentProfile, updateStudentProfileWithAvatar } from '@/services/student-profile'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))

describe('updateStudentProfile', () => {
  it('saves the submitted full name and phone on the student record', async () => {
    const update = vi.fn().mockResolvedValue({ id: 7 })
    vi.mocked(getPayload).mockResolvedValue({ update } as never)

    await updateStudentProfile(7, 'Nguyễn Văn A', '0987654321')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        id: 7,
        data: { fullName: 'Nguyễn Văn A', phone: '0987654321' },
        overrideAccess: true,
      }),
    )
  })

  // specs/011: reused by `updateProfileAction` (`/tai-khoan`), which needs to join its own
  // transaction and optionally set a freshly-uploaded avatar in the same write.
  it('joins the caller’s transaction and merges an avatar id when given', async () => {
    const update = vi.fn().mockResolvedValue({ id: 7 })
    vi.mocked(getPayload).mockResolvedValue({ update } as never)
    const req = { transactionID: 'tx-1' }

    await updateStudentProfile(7, 'Nguyễn Văn A', null, { avatarMediaId: 42, req })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        id: 7,
        data: { fullName: 'Nguyễn Văn A', phone: null, avatar: 42 },
        overrideAccess: true,
        req,
      }),
    )
  })

  it('omits the avatar key entirely when no avatar id is given', async () => {
    const update = vi.fn().mockResolvedValue({ id: 7 })
    vi.mocked(getPayload).mockResolvedValue({ update } as never)

    await updateStudentProfile(7, undefined, null)

    const { data } = update.mock.calls[0][0]
    expect(data).not.toHaveProperty('avatar')
  })
})

// specs/011: the transaction + avatar-upload logic `updateProfileAction` (`/tai-khoan`)
// used to hold itself — moved here so the action stays orchestration-only, matching
// student-enrollment.ts's own service-owns-the-transaction shape.
describe('updateStudentProfileWithAvatar', () => {
  // A plain stand-in, not jsdom's `File` — its `Blob`/`File` polyfill does not implement
  // `arrayBuffer()`, and the service only ever reads these four properties.
  const avatarFile = () =>
    ({
      arrayBuffer: async () => Buffer.from('fake-image-bytes'),
      name: 'avatar.png',
      size: 16,
      type: 'image/png',
    }) as unknown as File

  const payloadStub = (overrides: {
    create?: ReturnType<typeof vi.fn>
    update?: ReturnType<typeof vi.fn>
  }) => ({
    create: overrides.create ?? vi.fn().mockResolvedValue({ id: 55 }),
    db: {
      beginTransaction: vi.fn().mockResolvedValue('tx-1'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
    },
    update: overrides.update ?? vi.fn().mockResolvedValue({ id: 7 }),
  })

  it('uploads the avatar as media and sets it on the student in the same transaction', async () => {
    const create = vi.fn().mockResolvedValue({ id: 55 })
    const update = vi.fn().mockResolvedValue({ id: 7 })
    const stub = payloadStub({ create, update })
    vi.mocked(getPayload).mockResolvedValue(stub as never)

    await updateStudentProfileWithAvatar(7, 'Nguyễn Văn A', '0987654321', avatarFile())

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        file: expect.objectContaining({ name: 'avatar.png', mimetype: 'image/png' }),
        req: expect.objectContaining({ transactionID: 'tx-1' }),
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        id: 7,
        data: { fullName: 'Nguyễn Văn A', phone: '0987654321', avatar: 55 },
        req: expect.objectContaining({ transactionID: 'tx-1' }),
      }),
    )
    expect(stub.db.commitTransaction).toHaveBeenCalledWith('tx-1')
  })

  it('writes fullName/phone with no avatar key when no file is given', async () => {
    const create = vi.fn()
    const update = vi.fn().mockResolvedValue({ id: 7 })
    vi.mocked(getPayload).mockResolvedValue(payloadStub({ create, update }) as never)

    await updateStudentProfileWithAvatar(7, 'Nguyễn Văn A', null)

    expect(create).not.toHaveBeenCalled()
    const { data } = update.mock.calls[0][0]
    expect(data).not.toHaveProperty('avatar')
  })

  it('rolls back and rethrows when the write fails', async () => {
    const update = vi.fn().mockRejectedValue(new Error('db unreachable'))
    const stub = payloadStub({ update })
    vi.mocked(getPayload).mockResolvedValue(stub as never)

    await expect(
      updateStudentProfileWithAvatar(7, 'Nguyễn Văn A', null, avatarFile()),
    ).rejects.toThrow('db unreachable')

    expect(stub.db.rollbackTransaction).toHaveBeenCalledWith('tx-1')
  })
})
