import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'

import { NotificationBell } from '@/components/public/NotificationBell'

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })

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
  setVisibility('visible')
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
    vi.mocked(listNotificationsAction).mockResolvedValue({
      docs: [{ id: 1, title: 'Đăng ký khóa học thành công', content: 'Nội dung A' }],
      hasNextPage: false,
    } as never)
    render(<NotificationBell />)
    await screen.findByText('2')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText('Đăng ký khóa học thành công')).toBeTruthy()
    expect(listNotificationsAction).toHaveBeenCalledTimes(1)
  })

  it('says plainly when there is nothing to show', async () => {
    jsonOnce({ count: 0 })
    vi.mocked(listNotificationsAction).mockResolvedValue({ docs: [], hasNextPage: false } as never)
    render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText(/không có thông báo/i)).toBeTruthy()
  })

  it('closes when clicking outside the list', async () => {
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockResolvedValue({
      docs: [{ id: 1, title: 'Đăng ký khóa học thành công', content: 'Nội dung A' }],
      hasNextPage: false,
    } as never)
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

describe('NotificationBell — handleToggle correctness', () => {
  it('calls the action exactly once per open, even under React StrictMode', async () => {
    // StrictMode double-invokes the mount effect, so the count-poll effect itself fires
    // twice here — a `fetchMock` detail unrelated to what this test is about.
    jsonOnce({ count: 1 })
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockResolvedValue({ docs: [], hasNextPage: false } as never)
    render(
      <StrictMode>
        <NotificationBell />
      </StrictMode>,
    )
    await screen.findByText('1')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    // StrictMode invokes a functional setState updater twice in dev — the action call
    // must live outside that updater, or this fires twice for one click.
    await waitFor(() => expect(listNotificationsAction).toHaveBeenCalledTimes(1))
  })

  it('shows the empty state, not a stuck loading state, when the action fails', async () => {
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockRejectedValue(new Error('network error'))
    render(<NotificationBell />)
    await screen.findByText('1')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText(/không có thông báo/i)).toBeTruthy()
  })

  it('drops the badge to 0 as soon as the list is fetched, without waiting for the next poll', async () => {
    jsonOnce({ count: 3 })
    vi.mocked(listNotificationsAction).mockResolvedValue({
      docs: [{ id: 1, title: 'A', content: 'B' }],
      hasNextPage: false,
    } as never)
    render(<NotificationBell />)
    await screen.findByText('3')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

    await waitFor(() => expect(screen.queryByText('3')).toBeNull())
  })

  it('does not show the previous open’s list while a fresh fetch is in flight', async () => {
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockResolvedValueOnce({
      docs: [{ id: 1, title: 'Cũ', content: 'Nội dung cũ' }],
      hasNextPage: false,
    } as never)
    render(<NotificationBell />)
    await screen.findByText('1')

    const toggle = () => fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
    toggle()
    expect(await screen.findByText('Cũ')).toBeTruthy()
    toggle() // close
    await waitFor(() => expect(screen.queryByText('Cũ')).toBeNull())

    let resolveList!: (value: unknown) => void
    vi.mocked(listNotificationsAction).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve
      }) as never,
    )
    toggle() // reopen — fetch pending

    expect(screen.queryByText('Cũ')).toBeNull()
    expect(screen.getByText(/đang tải/i)).toBeTruthy()

    resolveList({ docs: [{ id: 2, title: 'Mới', content: 'Nội dung mới' }], hasNextPage: false })
    expect(await screen.findByText('Mới')).toBeTruthy()
  })
})

/** jsdom never computes real layout — `scrollHeight`/`clientHeight` stay 0 unless stubbed. */
const stubScrollMetrics = (
  el: HTMLElement,
  metrics: { scrollTop: number; scrollHeight: number; clientHeight: number },
) => {
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: metrics.scrollTop })
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: metrics.scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: metrics.clientHeight })
}

describe('NotificationBell — infinite scroll (loads more past the first page)', () => {
  it('loads the next page once scrolled near the bottom, and appends it', async () => {
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockResolvedValueOnce({
      docs: [{ id: 1, title: 'A', content: 'Nội dung A' }],
      hasNextPage: true,
    } as never)
    render(<NotificationBell />)
    await screen.findByText('1')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
    expect(await screen.findByText('A')).toBeTruthy()

    vi.mocked(listNotificationsAction).mockResolvedValueOnce({
      docs: [{ id: 2, title: 'B', content: 'Nội dung B' }],
      hasNextPage: false,
    } as never)
    const list = screen.getByRole('list')
    stubScrollMetrics(list, { scrollTop: 100, scrollHeight: 140, clientHeight: 40 })
    fireEvent.scroll(list)

    expect(await screen.findByText('B')).toBeTruthy()
    expect(screen.getByText('A')).toBeTruthy()
    expect(listNotificationsAction).toHaveBeenLastCalledWith(2)
  })

  it('does not fetch again once there is no further page', async () => {
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockResolvedValueOnce({
      docs: [{ id: 1, title: 'A', content: 'Nội dung A' }],
      hasNextPage: false,
    } as never)
    render(<NotificationBell />)
    await screen.findByText('1')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
    await screen.findByText('A')

    const list = screen.getByRole('list')
    stubScrollMetrics(list, { scrollTop: 100, scrollHeight: 140, clientHeight: 40 })
    fireEvent.scroll(list)

    expect(listNotificationsAction).toHaveBeenCalledTimes(1)
  })

  it('does not fetch again while still scrolled near the bottom and a load is in flight', async () => {
    jsonOnce({ count: 1 })
    vi.mocked(listNotificationsAction).mockResolvedValueOnce({
      docs: [{ id: 1, title: 'A', content: 'Nội dung A' }],
      hasNextPage: true,
    } as never)
    render(<NotificationBell />)
    await screen.findByText('1')

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
    await screen.findByText('A')

    let resolveNextPage!: (value: unknown) => void
    vi.mocked(listNotificationsAction).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNextPage = resolve
      }) as never,
    )
    const list = screen.getByRole('list')
    stubScrollMetrics(list, { scrollTop: 100, scrollHeight: 140, clientHeight: 40 })
    fireEvent.scroll(list)
    fireEvent.scroll(list)

    resolveNextPage({ docs: [{ id: 2, title: 'B', content: 'Nội dung B' }], hasNextPage: false })
    await screen.findByText('B')

    expect(listNotificationsAction).toHaveBeenCalledTimes(2)
  })
})

describe('NotificationBell — polling pauses while the tab is hidden', () => {
  it('does not poll while hidden, and polls immediately once visible again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    jsonOnce({ count: 1 })
    render(<NotificationBell />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    jsonOnce({ count: 2 })
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
})
