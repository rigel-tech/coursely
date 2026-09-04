import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

// The nested CTAs pull in server actions and the app router; stub what they touch.
vi.mock('@/actions/auth/login', () => ({ loginAction: vi.fn() }))
vi.mock('@/actions/auth/logout', () => ({ logoutAction: vi.fn() }))
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

const signIn = () => screen.queryByRole('button', { name: /đăng nhập/i })
const register = () => screen.queryByRole('button', { name: /đăng ký/i })
const signOut = () => screen.queryByRole('button', { name: /đăng xuất/i })

describe('HeaderAuthControls', () => {
  it('shows the sign-in / register CTAs before the check resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    render(React.createElement(HeaderAuthControls))

    expect(signIn()).toBeTruthy()
    expect(register()).toBeTruthy()
    expect(signOut()).toBeNull()
  })

  it('keeps the CTAs when the check reports not authenticated', async () => {
    jsonOnce({ authenticated: false })
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/next/auth-status'))
    expect(signIn()).toBeTruthy()
    expect(signOut()).toBeNull()
  })

  it('keeps the CTAs when the check fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(signIn()).toBeTruthy()
    expect(signOut()).toBeNull()
  })

  it('swaps to the sign-out control when the check reports authenticated', async () => {
    jsonOnce({ authenticated: true })
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(signOut()).toBeTruthy())
    expect(signIn()).toBeNull()
    expect(register()).toBeNull()
  })

  it('calls the status endpoint exactly once', async () => {
    jsonOnce({ authenticated: true })
    render(React.createElement(HeaderAuthControls))

    await waitFor(() => expect(signOut()).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
