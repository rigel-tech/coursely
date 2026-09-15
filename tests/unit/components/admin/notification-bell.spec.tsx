import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'

vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { routes: { api: '/api' } } }),
  // A minimal stand-in for the real Popup (portal + positioning logic is not what this
  // component's own tests are about) — a plain disclosure that calls onToggleOpen the
  // same way the real one does.
  Popup: ({
    button,
    render: renderContent,
    onToggleOpen,
  }: {
    button: React.ReactNode
    render?: (args: { close: () => void }) => React.ReactNode
    onToggleOpen?: (active: boolean) => void
  }) => {
    const [open, setOpen] = React.useState(false)
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            const next = !open
            setOpen(next)
            onToggleOpen?.(next)
          }}
        >
          {button}
        </button>
        {open && renderContent?.({ close: () => setOpen(false) })}
      </div>
    )
  },
}))

import { NotificationBell } from '@/components/admin/NotificationBell'

const fetchMock = vi.fn()

const jsonOnce = (value: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => value })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('NotificationBell (admin) — the count', () => {
  it('shows the unread count as a number', async () => {
    jsonOnce({ totalDocs: 3 })
    render(<NotificationBell />)

    expect(await screen.findByText('3')).toBeTruthy()
  })

  it('shows no badge at all when the count is zero', async () => {
    jsonOnce({ totalDocs: 0 })
    render(<NotificationBell />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('0')).toBeNull()
  })

  it('calls the unread-count endpoint for the whole collection — not scoped to staff-only rows', async () => {
    jsonOnce({ totalDocs: 0 })
    render(<NotificationBell />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('/api/notifications/count?where%5BisRead%5D%5Bequals%5D=false')
  })

  it('polls again after 5 seconds', async () => {
    // shouldAdvanceTime keeps testing-library's own waitFor polling alive under fake timers.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    jsonOnce({ totalDocs: 1 })
    render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    jsonOnce({ totalDocs: 5 })
    await vi.advanceTimersByTimeAsync(5_000)

    expect(await screen.findByText('5')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('stops polling once unmounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    jsonOnce({ totalDocs: 1 })
    const { unmount } = render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    unmount()
    await vi.advanceTimersByTimeAsync(20_000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('NotificationBell (admin) — opening the list', () => {
  it("fetches the whole collection's list, not just staff-only rows", async () => {
    jsonOnce({ totalDocs: 1 })
    render(<NotificationBell />)
    await screen.findByText('1')

    jsonOnce({
      docs: [{ id: 101, title: 'Có người dùng đăng ký tài khoản mới', content: 'Nội dung' }],
    })
    jsonOnce({})
    fireEvent.click(screen.getByRole('button', { name: /thông báo/i }))

    expect(await screen.findByText('Có người dùng đăng ký tài khoản mới')).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const [listUrl] = fetchMock.mock.calls[1] as [string]
    expect(listUrl).toBe('/api/notifications?sort=-createdAt&limit=20')
  })

  it("marks only the rows without a student as read — a student's own notification is left untouched", async () => {
    jsonOnce({ totalDocs: 2 })
    render(<NotificationBell />)
    await screen.findByText('2')

    jsonOnce({
      docs: [
        {
          id: 101,
          title: 'Có người dùng đăng ký tài khoản mới',
          content: 'Nội dung',
          student: null,
        },
        { id: 202, title: 'Đăng ký khóa học thành công', content: 'Nội dung', student: 7 },
      ],
    })
    jsonOnce({})
    fireEvent.click(screen.getByRole('button', { name: /thông báo/i }))

    expect(await screen.findByText('Đăng ký khóa học thành công')).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    const [patchUrl, patchOptions] = fetchMock.mock.calls[2] as [
      string,
      { body: string; method: string },
    ]
    expect(patchUrl).toBe('/api/notifications?where[id][in][0]=101')
    expect(patchOptions.method).toBe('PATCH')
    expect(JSON.parse(patchOptions.body)).toEqual({ isRead: true })
  })

  it('does not PATCH at all when the list is empty', async () => {
    jsonOnce({ totalDocs: 0 })
    render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    jsonOnce({ docs: [] })
    fireEvent.click(screen.getByRole('button', { name: /thông báo/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('does not PATCH at all when every fetched notification belongs to a student', async () => {
    jsonOnce({ totalDocs: 1 })
    render(<NotificationBell />)
    await screen.findByText('1')

    jsonOnce({
      docs: [{ id: 202, title: 'Đăng ký khóa học thành công', content: 'Nội dung', student: 7 }],
    })
    fireEvent.click(screen.getByRole('button', { name: /thông báo/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('says plainly when there is nothing to show', async () => {
    jsonOnce({ totalDocs: 0 })
    render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    jsonOnce({ docs: [] })
    fireEvent.click(screen.getByRole('button', { name: /thông báo/i }))

    expect(await screen.findByText(/không có thông báo/i)).toBeTruthy()
  })
})
