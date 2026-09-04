import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** The action runs for real in tests/int; here we only drive its result. */
const logoutAction = vi.fn()
vi.mock('@/actions/auth/logout', () => ({
  logoutAction: (...args: unknown[]) => logoutAction(...args),
}))

const { LogoutCta } = await import('@/components/public/LogoutCta')

const assign = vi.fn()

beforeEach(() => {
  logoutAction.mockReset()
  assign.mockReset()
  // jsdom's window.location.assign is non-configurable, so shadow the whole object.
  vi.stubGlobal('location', { assign, href: 'http://localhost/' })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const idle = () => screen.getByRole('button', { name: /^đăng xuất$/i }) as HTMLButtonElement
const busy = () => screen.getByRole('button', { name: /đang đăng xuất/i }) as HTMLButtonElement

describe('LogoutCta', () => {
  it('calls logoutAction and hard-navigates to the returned redirectTo', async () => {
    logoutAction.mockResolvedValue({ redirectTo: '/' })
    render(React.createElement(LogoutCta))

    fireEvent.click(idle())

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'))
    expect(logoutAction).toHaveBeenCalledTimes(1)
  })

  it('disables the button and ignores a second click while pending', async () => {
    logoutAction.mockImplementation(() => new Promise(() => {}))
    render(React.createElement(LogoutCta))

    fireEvent.click(idle())

    await waitFor(() => {
      expect(busy().disabled).toBe(true)
      expect(busy().getAttribute('aria-busy')).toBe('true')
    })

    fireEvent.click(busy())
    expect(logoutAction).toHaveBeenCalledTimes(1)
  })

  it('re-enables the button and does not navigate when the action rejects', async () => {
    logoutAction.mockRejectedValue(new Error('backend down'))
    render(React.createElement(LogoutCta))

    fireEvent.click(idle())

    await waitFor(() => expect(idle().disabled).toBe(false))
    expect(assign).not.toHaveBeenCalled()
  })
})
