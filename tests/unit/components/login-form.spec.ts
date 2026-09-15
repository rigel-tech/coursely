import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** The action runs for real in tests/int; here we only drive its result. */
const loginAction = vi.fn()
vi.mock('@/actions/student/login', () => ({
  loginAction: (...args: unknown[]) => loginAction(...args),
}))

const { LoginForm } = await import('@/components/public/forms/LoginForm')

const assign = vi.fn()
const replace = vi.fn()

beforeEach(() => {
  loginAction.mockReset()
  assign.mockReset()
  replace.mockReset()
  // jsdom's window.location.assign/replace is non-configurable, so shadow the whole object.
  vi.stubGlobal('location', { assign, replace, href: 'http://localhost/' })
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

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
  })

  it('follows redirectTo on an error state too (AUTH_022 → /xac-thuc-otp)', async () => {
    loginAction.mockResolvedValue({
      status: 'error',
      message: 'Tài khoản chưa xác minh email.',
      redirectTo: '/xac-thuc-otp',
    })
    render(React.createElement(LoginForm))

    fill()
    submit()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/xac-thuc-otp'))
  })

  it('shows the message and stays put when there is no redirectTo', async () => {
    loginAction.mockResolvedValue({
      status: 'error',
      message: 'Email hoặc mật khẩu không đúng.',
    })
    render(React.createElement(LoginForm))

    fill()
    submit()

    expect(await screen.findByText(/không đúng/)).toBeTruthy()
    expect(assign).not.toHaveBeenCalled()
  })

  it('offers no "remember me" control at all', () => {
    loginAction.mockResolvedValue({ status: 'idle' })
    render(React.createElement(LoginForm))

    expect(screen.queryByLabelText('Ghi nhớ đăng nhập')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('marks a malformed email itself', async () => {
    loginAction.mockResolvedValue({ status: 'idle' })
    render(React.createElement(LoginForm))

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret12' } })
    submit()

    await waitFor(() => {
      expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
    })
    expect(await screen.findByText('Email không đúng định dạng')).toBeTruthy()
    expect(loginAction).not.toHaveBeenCalled()
  })

  // The action rethrows anything it cannot translate, so the form is the last place a
  // system failure can still be shown to a person rather than crashing the page.
  it('shows a banner when the action rejects, instead of crashing', async () => {
    loginAction.mockRejectedValue(new Error('database is on fire'))
    render(React.createElement(LoginForm))

    fill()
    submit()

    expect(await screen.findByText(/lỗi hệ thống/i)).toBeTruthy()
    expect(assign).not.toHaveBeenCalled()
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

  it('folds a callbackUrl from the URL into the submitted object', async () => {
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
      expect(loginAction.mock.calls.at(-1)?.[0]).toEqual({
        email: 'a@b.com',
        password: 'secret12',
        callbackUrl: '/khoa-hoc',
      })
    })
  })

  // RQ2 — the client now owns first-pass validation. The action is a network round
  // trip and a credential check; a blank email must not buy either.
  it('validates on the client — a blank email never reaches the action', async () => {
    loginAction.mockResolvedValue({ status: 'idle' })
    render(React.createElement(LoginForm))

    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret12' } })
    submit()

    expect(await screen.findByText('Vui lòng nhập email')).toBeTruthy()
    expect(loginAction).not.toHaveBeenCalled()
  })
})
