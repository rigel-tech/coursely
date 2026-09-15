import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** The action is exercised for real elsewhere (tests/int); here we only drive its result. */
const registerAction = vi.fn()
vi.mock('@/actions/student/register', () => ({
  registerAction: (...args: unknown[]) => registerAction(...args),
}))

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const { RegisterForm } = await import('@/components/public/forms/RegisterForm')

beforeEach(() => {
  registerAction.mockReset()
  push.mockReset()
})

afterEach(cleanup)

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const fillAndSubmit = () => {
  fill('Họ và tên', 'Nguyễn Văn A')
  fill('Email', 'a@example.com')
  fill('Mật khẩu', 'abcd1234')
  fill('Nhập lại mật khẩu', 'abcd1234')
  fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
}

describe('RegisterForm', () => {
  // The action takes a plain object now, not `(prevState, FormData)`. A FormData would still
  // reach the server and still fail validation there, so nothing but this notices the slip.
  it('calls the action with one object, not a FormData', async () => {
    registerAction.mockResolvedValue({ status: 'success' })
    render(React.createElement(RegisterForm))

    fillAndSubmit()

    await waitFor(() => expect(registerAction).toHaveBeenCalledTimes(1))
    expect(registerAction.mock.calls[0]).toHaveLength(1)
    expect(registerAction.mock.calls[0][0]).toEqual({
      fullName: 'Nguyễn Văn A',
      email: 'a@example.com',
      password: 'abcd1234',
      confirmPassword: 'abcd1234',
    })
  })

  it('navigates to /xac-thuc-otp once the action reports success', async () => {
    registerAction.mockResolvedValue({ status: 'success' })
    render(React.createElement(RegisterForm))

    fillAndSubmit()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/xac-thuc-otp'))
  })

  // Guard: only 'success' navigates — an error state stays put and renders its message.
  it('stays on the page and shows the message when the action returns an error', async () => {
    registerAction.mockResolvedValue({
      status: 'error',
      message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
    })
    render(React.createElement(RegisterForm))

    fillAndSubmit()

    expect(await screen.findByText(/Có lỗi hệ thống/)).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  // Duplicate-email failures target the email field specifically, not the generic banner —
  // distinct from a system failure or a server-side validation rejection.
  it('shows the message under the email field, not the generic banner, when the action reports a duplicate email', async () => {
    registerAction.mockResolvedValue({
      status: 'error',
      field: 'email',
      message: 'Email đã tồn tại.',
    })
    render(React.createElement(RegisterForm))

    fillAndSubmit()

    const messages = await screen.findAllByText('Email đã tồn tại.')
    expect(messages).toHaveLength(1)
    expect(messages[0].id).toBe('register-email-error')
    expect(push).not.toHaveBeenCalled()
  })

  // The action rethrows anything it has no copy for (rule: throw, never console.error), so
  // this is the last place a system failure can reach the person instead of crashing the page.
  it('shows a system-failure banner when the action throws', async () => {
    registerAction.mockRejectedValue(new Error('boom'))
    render(React.createElement(RegisterForm))

    fillAndSubmit()

    expect(await screen.findByText(/Có lỗi hệ thống/)).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  it('no longer asks for terms consent', () => {
    render(React.createElement(RegisterForm))

    expect(screen.queryByLabelText(/điều khoản/i)).toBeNull()
  })

  it('blocks a mismatched confirmation before ever calling the action', async () => {
    render(React.createElement(RegisterForm))

    fill('Họ và tên', 'Nguyễn Văn A')
    fill('Email', 'a@example.com')
    fill('Mật khẩu', 'abcd1234')
    fill('Nhập lại mật khẩu', 'abcd9999')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    expect(
      await screen.findByText('Mật khẩu nhập lại không khớp với mật khẩu đã nhập'),
    ).toBeTruthy()
    expect(registerAction).not.toHaveBeenCalled()
  })

  // Regression: the client rule must match the server's — a password with no digit is
  // rejected the same way `registerSchema` rejects it server-side.
  it('rejects a password with no digit, the same rule the server enforces', async () => {
    render(React.createElement(RegisterForm))

    fill('Họ và tên', 'Nguyễn Văn A')
    fill('Email', 'a@example.com')
    fill('Mật khẩu', 'abcdefgh')
    fill('Nhập lại mật khẩu', 'abcdefgh')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    expect(await screen.findByText('Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số')).toBeTruthy()
    expect(registerAction).not.toHaveBeenCalled()
  })
})
