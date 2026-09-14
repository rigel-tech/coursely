import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NotificationBell } from '@/components/public/NotificationBell'

vi.mock('@/actions/student/notifications', () => ({
  listNotificationsAction: vi.fn(),
}))

import { listNotificationsAction } from '@/actions/student/notifications'

const fetchMock = vi.fn()

const jsonOnce = (value: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => value })

beforeEach(() => {
  fetchMock.mockReset()
  vi.mocked(listNotificationsAction).mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('NotificationBell — the count (specs/010, User Story 1)', () => {
  it('shows the unread count as a number', async () => {
    jsonOnce({ count: 3 })
    render(<NotificationBell />)

    expect(await screen.findByText('3')).toBeTruthy()
  })

  it('shows no badge at all when the count is zero', async () => {
    jsonOnce({ count: 0 })
    render(<NotificationBell />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('0')).toBeNull()
  })

  it('calls the count endpoint', async () => {
    jsonOnce({ count: 0 })
    render(<NotificationBell />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/next/notifications-count'))
  })

  it('polls again after 5 seconds', async () => {
    // shouldAdvanceTime keeps testing-library's own waitFor polling alive under fake timers.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    jsonOnce({ count: 1 })
    render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    jsonOnce({ count: 5 })
    await vi.advanceTimersByTimeAsync(5_000)

    expect(await screen.findByText('5')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('stops polling once unmounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    jsonOnce({ count: 1 })
    const { unmount } = render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    unmount()
    await vi.advanceTimersByTimeAsync(20_000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('NotificationBell — opening the list (specs/010, User Story 2)', () => {
  it('opens the list and shows its contents on click', async () => {
    jsonOnce({ count: 2 })
    vi.mocked(listNotificationsAction).mockResolvedValue([
      { id: 1, title: 'Đăng ký khóa học thành công', content: 'Nội dung A' },
    ] as never)
    render(<NotificationBell />)
    await screen.findByText('2')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText('Đăng ký khóa học thành công')).toBeTruthy()
    expect(listNotificationsAction).toHaveBeenCalledTimes(1)
  })

  it('says plainly when there is nothing to show', async () => {
    jsonOnce({ count: 0 })
    vi.mocked(listNotificationsAction).mockResolvedValue([])
    render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText(/không có thông báo/i)).toBeTruthy()
  })

  it('closes when clicking outside the list', async () => {
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockResolvedValue([
      { id: 1, title: 'Đăng ký khóa học thành công', content: 'Nội dung A' },
    ] as never)
    render(
      <div>
        <NotificationBell />
        <button type="button">outside</button>
      </div>,
    )
    await screen.findByText('1')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
    expect(await screen.findByText('Đăng ký khóa học thành công')).toBeTruthy()

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }))

    await waitFor(() => expect(screen.queryByText('Đăng ký khóa học thành công')).toBeNull())
  })
})
