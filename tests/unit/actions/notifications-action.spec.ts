import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listNotificationsAction } from '@/actions/student/notifications'

vi.mock('@/services/student-notifications', () => ({
  listAndMarkRecentNotifications: vi.fn(),
}))

vi.mock('@/lib/auth/session-student', () => ({
  getSessionStudent: vi.fn(),
}))

import { getSessionStudent } from '@/lib/auth/session-student'
import { listAndMarkRecentNotifications } from '@/services/student-notifications'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listNotificationsAction', () => {
  it('returns the signed-in student’s notifications', async () => {
    const docs = [{ id: 1, title: 'A' }]
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7 } as never)
    vi.mocked(listAndMarkRecentNotifications).mockResolvedValue(docs as never)

    await expect(listNotificationsAction()).resolves.toBe(docs)
    expect(listAndMarkRecentNotifications).toHaveBeenCalledWith(7)
  })

  it('returns an empty array for a signed-out caller, rather than throwing', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)

    await expect(listNotificationsAction()).resolves.toEqual([])
    expect(listAndMarkRecentNotifications).not.toHaveBeenCalled()
  })
})
