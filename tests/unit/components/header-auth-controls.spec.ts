import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

// The nested CTAs pull in server actions and the app router; stub what they touch.
vi.mock('@/actions/student/login', () => ({ loginAction: vi.fn() }))
vi.mock('@/actions/student/logout', () => ({ logoutAction: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const { HeaderAuthControls } = await import('@/components/public/HeaderAuthControls')

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonOnce = (value: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => value })

const signIn = () => screen.queryByRole('link', { name: /đăng nhập/i })
const register = () => screen.queryByRole('link', { name: /đăng ký/i })
const account = () => screen.queryByRole('link', { name: /minh anh|tài khoản/i })

describe('HeaderAuthControls', () => {
  it('shows the sign-in / register CTAs before the check resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    render(React.createElement(HeaderAuthControls))

    expect(signIn()).toBeTruthy()
    expect(register()).toBeTruthy()
    expect(account()).toBeNull()
  })

  it('keeps the CTAs when the check reports not authenticated', async () => {
    jsonOnce({ authenticated: false })
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/next/auth-status'))
    expect(signIn()).toBeTruthy()
    expect(account()).toBeNull()
  })

  it('keeps the CTAs when the check fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(signIn()).toBeTruthy()
    expect(account()).toBeNull()
  })

  it('swaps to the account control when the check reports authenticated', async () => {
    jsonOnce({ authenticated: true })
    jsonOnce({ count: 0 })
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(account()).toBeTruthy())
    expect(signIn()).toBeNull()
    expect(register()).toBeNull()
  })

  it('calls the status endpoint once, and — once authenticated — the notification count endpoint once', async () => {
    jsonOnce({ authenticated: true })
    jsonOnce({ count: 0 })
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(account()).toBeTruthy())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenCalledWith('/next/auth-status')
    expect(fetchMock).toHaveBeenCalledWith('/next/notifications-count')
  })

  it('never calls the notification count endpoint when not authenticated', async () => {
    jsonOnce({ authenticated: false })
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(signIn()).toBeTruthy())
    expect(fetchMock).not.toHaveBeenCalledWith('/next/notifications-count')
  })
})
