import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { updateStudentProfile } from '@/services/student-profile'

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
