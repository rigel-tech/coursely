import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import {
  countUnreadNotifications,
  listAndMarkRecentNotifications,
} from '@/services/student-notifications'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))

describe('countUnreadNotifications', () => {
  it('counts only this student’s unread notifications', async () => {
    const count = vi.fn().mockResolvedValue({ totalDocs: 3 })
    vi.mocked(getPayload).mockResolvedValue({ count } as never)

    await expect(countUnreadNotifications(7)).resolves.toBe(3)

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'notifications',
        where: {
          and: [{ student: { equals: 7 } }, { isRead: { equals: false } }],
        },
        overrideAccess: true,
      }),
    )
  })
})

describe('listAndMarkRecentNotifications', () => {
  it('scopes the query to this student, most recent first, limited to 20, page 1 by default', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], hasNextPage: false })
    const update = vi.fn()
    vi.mocked(getPayload).mockResolvedValue({ find, update } as never)

    await listAndMarkRecentNotifications(7)

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'notifications',
        where: { student: { equals: 7 } },
        sort: '-createdAt',
        limit: 20,
        page: 1,
        depth: 0,
        overrideAccess: true,
      }),
    )
  })

  it('requests the given page', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], hasNextPage: false })
    const update = vi.fn()
    vi.mocked(getPayload).mockResolvedValue({ find, update } as never)

    await listAndMarkRecentNotifications(7, { page: 3 })

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }))
  })

  it('marks exactly the returned batch as read — not every unread notification', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 101 }, { id: 102 }], hasNextPage: false })
    const update = vi.fn()
    vi.mocked(getPayload).mockResolvedValue({ find, update } as never)

    await listAndMarkRecentNotifications(7)

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'notifications',
        where: {
          and: [{ id: { in: [101, 102] } }, { isRead: { equals: false } }],
        },
        data: { isRead: true },
        depth: 0,
        overrideAccess: true,
      }),
    )
  })

  it('does not write at all when there is nothing to mark', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], hasNextPage: false })
    const update = vi.fn()
    vi.mocked(getPayload).mockResolvedValue({ find, update } as never)

    await listAndMarkRecentNotifications(7)

    expect(update).not.toHaveBeenCalled()
  })

  it('returns the fetched documents and whether a further page exists', async () => {
    const docs = [{ id: 101, title: 'A' }]
    const find = vi.fn().mockResolvedValue({ docs, hasNextPage: true })
    const update = vi.fn()
    vi.mocked(getPayload).mockResolvedValue({ find, update } as never)

    await expect(listAndMarkRecentNotifications(7)).resolves.toEqual({
      docs,
      hasNextPage: true,
    })
  })
})
