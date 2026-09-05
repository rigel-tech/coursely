import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** The action runs for real in tests/int; here we only drive its result. */
const loginAction = vi.fn()
vi.mock('@/actions/auth/login', () => ({
  loginAction: (...args: unknown[]) => loginAction(...args),
}))

const { LoginForm } = await import('@/components/public/LoginCta/LoginForm')

const assign = vi.fn()

beforeEach(() => {
  loginAction.mockReset()
  assign.mockReset()
  // jsdom's window.location.assign is non-configurable, so shadow the whole object.
  vi.stubGlobal('location', { assign, href: 'http://localhost/' })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const fill = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret12' } })
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

describe('LoginForm', () => {
  it('hard-navigates to redirectTo on success', async () => {
    loginAction.mockResolvedValue({ status: 'success', redirectTo: '/' })
    render(React.createElement(LoginForm))

    fill()
    submit()

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'))
  })

  it('follows redirectTo on an error state too (AUTH_022 → /xac-thuc-otp)', async () => {
    loginAction.mockResolvedValue({
      status: 'error',
      code: 'AUTH_022',
      message: 'Tài khoản chưa xác minh email.',
      redirectTo: '/xac-thuc-otp',
    })
    render(React.createElement(LoginForm))

    fill()
    submit()

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/xac-thuc-otp'))
  })

  it('shows the message and stays put when there is no redirectTo', async () => {
    loginAction.mockResolvedValue({
      status: 'error',
      code: 'AUTH_021',
      message: 'Email hoặc mật khẩu không đúng.',
    })
    render(React.createElement(LoginForm))

    fill()
    submit()

    expect(await screen.findByText(/không đúng/)).toBeTruthy()
    expect(assign).not.toHaveBeenCalled()
  })

  it('marks the offending inputs and carries a rememberMe checkbox', async () => {
    loginAction.mockResolvedValue({
      status: 'error',
      code: 'AUTH_021',
      message: 'x',
      fieldErrors: { email: 'Email không hợp lệ', password: 'Bắt buộc' },
    })
    render(React.createElement(LoginForm))

    expect(screen.getByLabelText('Ghi nhớ đăng nhập')).toBeTruthy()

    fill()
    submit()

    await waitFor(() => {
      expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
      expect(screen.getByLabelText('Mật khẩu').getAttribute('aria-invalid')).toBe('true')
    })
  })

  it('disables the submit while the action is pending', async () => {
    loginAction.mockImplementation(() => new Promise(() => {}))
    render(React.createElement(LoginForm))

    fill()
    submit()

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Đang đăng nhập…' }) as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })

  it('folds a callbackUrl from the URL into the submitted form', async () => {
    vi.stubGlobal('location', {
      assign,
      href: 'http://localhost/?callbackUrl=/khoa-hoc',
      search: '?callbackUrl=/khoa-hoc',
    })
    loginAction.mockResolvedValue({ status: 'idle' })
    render(React.createElement(LoginForm))

    fill()
    submit()

    await waitFor(() => {
      const fd = loginAction.mock.calls.at(-1)?.[1] as FormData | undefined
      expect(fd?.get('callbackUrl')).toBe('/khoa-hoc')
    })
  })
})
