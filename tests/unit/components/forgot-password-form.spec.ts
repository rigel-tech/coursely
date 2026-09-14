import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** The action runs for real in tests/int; here we only drive its result. */
const forgotPasswordAction = vi.fn()
vi.mock('@/actions/student/forgot-password', () => ({
  forgotPasswordAction: (...args: unknown[]) => forgotPasswordAction(...args),
}))

const { ForgotPasswordForm } = await import('@/components/public/forms/ForgotPasswordForm')

beforeEach(() => {
  forgotPasswordAction.mockReset()
})

afterEach(cleanup)

const fill = (email: string) =>
  fireEvent.change(screen.getByLabelText('Email đăng ký'), { target: { value: email } })
const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu' }))

describe('ForgotPasswordForm', () => {
  it('calls the action with the plain email string, not a FormData or object', async () => {
    forgotPasswordAction.mockResolvedValue({ status: 'success', message: 'Đã gửi.' })
    render(React.createElement(ForgotPasswordForm))

    fill('a@example.com')
    submit()

    await waitFor(() => expect(forgotPasswordAction).toHaveBeenCalledTimes(1))
    expect(forgotPasswordAction.mock.calls[0]).toEqual(['a@example.com'])
  })

  it('shows the success card once the action resolves, with its message', async () => {
    forgotPasswordAction.mockResolvedValue({
      status: 'success',
      message: 'Đã gửi hướng dẫn đặt lại mật khẩu.',
    })
    render(React.createElement(ForgotPasswordForm))

    fill('a@example.com')
    submit()

    expect(await screen.findByText('Kiểm tra hộp thư của bạn')).toBeTruthy()
    expect(screen.getByText('Đã gửi hướng dẫn đặt lại mật khẩu.')).toBeTruthy()
  })

  // Client-side validation, through zodResolver — the same schema the server re-checks —
  // must stop an empty submission before the action is ever called.
  it('blocks an empty submission before ever calling the action', async () => {
    render(React.createElement(ForgotPasswordForm))

    submit()

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(forgotPasswordAction).not.toHaveBeenCalled()
  })

  // The action rethrows anything it has no copy for (see forgot-password.ts) — this is the
  // last place a system failure can reach the person instead of crashing the page.
  it('shows a system-failure banner when the action throws', async () => {
    forgotPasswordAction.mockRejectedValue(new Error('boom'))
    render(React.createElement(ForgotPasswordForm))

    fill('a@example.com')
    submit()

    expect(await screen.findByText(/Có lỗi hệ thống/)).toBeTruthy()
  })
})
