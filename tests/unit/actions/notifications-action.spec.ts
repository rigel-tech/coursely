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
    const page = { docs: [{ id: 1, title: 'A' }], hasNextPage: false }
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7 } as never)
    vi.mocked(listAndMarkRecentNotifications).mockResolvedValue(page as never)

    await expect(listNotificationsAction()).resolves.toBe(page)
    expect(listAndMarkRecentNotifications).toHaveBeenCalledWith(7, { page: 1 })
  })

  it('passes the requested page through to the service', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue({ id: 7 } as never)
    vi.mocked(listAndMarkRecentNotifications).mockResolvedValue({
      docs: [],
      hasNextPage: false,
    } as never)

    await listNotificationsAction(2)

    expect(listAndMarkRecentNotifications).toHaveBeenCalledWith(7, { page: 2 })
  })

  it('returns an empty page for a signed-out caller, rather than throwing', async () => {
    vi.mocked(getSessionStudent).mockResolvedValue(null)

    await expect(listNotificationsAction()).resolves.toEqual({ docs: [], hasNextPage: false })
    expect(listAndMarkRecentNotifications).not.toHaveBeenCalled()
  })
})
