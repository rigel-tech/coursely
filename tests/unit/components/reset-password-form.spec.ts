import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** The action runs for real in tests/int; here we only drive its result. */
const resetPasswordAction = vi.fn()
vi.mock('@/actions/student/reset-password', () => ({
  resetPasswordAction: (...args: unknown[]) => resetPasswordAction(...args),
}))

const { ResetPasswordForm } = await import('@/components/public/forms/ResetPasswordForm')

beforeEach(() => {
  resetPasswordAction.mockReset()
})

afterEach(cleanup)

const fill = (password: string, confirmPassword: string) => {
  fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), {
    target: { value: confirmPassword },
  })
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }))

describe('ResetPasswordForm', () => {
  it('shows the invalid-link card and never renders the form when there is no token', () => {
    render(React.createElement(ResetPasswordForm, {}))

    expect(screen.getByText('Liên kết không hợp lệ')).toBeTruthy()
    expect(screen.queryByLabelText('Mật khẩu mới')).toBeNull()
  })

  it('calls the action with one object carrying the token and both fields', async () => {
    resetPasswordAction.mockResolvedValue({ status: 'success', message: 'Xong.' })
    render(React.createElement(ResetPasswordForm, { token: 'tok-123' }))

    fill('abcd1234', 'abcd1234')
    submit()

    await waitFor(() => expect(resetPasswordAction).toHaveBeenCalledTimes(1))
    expect(resetPasswordAction.mock.calls[0]).toEqual([
      { token: 'tok-123', password: 'abcd1234', confirmPassword: 'abcd1234' },
    ])
  })

  it('blocks a mismatched confirmation before ever calling the action', async () => {
    render(React.createElement(ResetPasswordForm, { token: 'tok-123' }))

    fill('abcd1234', 'abcd9999')
    submit()

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(resetPasswordAction).not.toHaveBeenCalled()
  })

  it('shows the success card once the action resolves', async () => {
    resetPasswordAction.mockResolvedValue({
      status: 'success',
      message: 'Bạn có thể đăng nhập ngay bây giờ.',
    })
    render(React.createElement(ResetPasswordForm, { token: 'tok-123' }))

    fill('abcd1234', 'abcd1234')
    submit()

    expect(await screen.findByText('Đặt lại mật khẩu thành công!')).toBeTruthy()
    expect(screen.getByText('Bạn có thể đăng nhập ngay bây giờ.')).toBeTruthy()
  })

  it('shows the error message and stays on the form when the token cannot be honoured', async () => {
    resetPasswordAction.mockResolvedValue({
      status: 'error',
      message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
    })
    render(React.createElement(ResetPasswordForm, { token: 'tok-123' }))

    fill('abcd1234', 'abcd1234')
    submit()

    expect(await screen.findByText(/hết hạn/)).toBeTruthy()
    expect(screen.getByLabelText('Mật khẩu mới')).toBeTruthy()
  })

  // The action rethrows anything it has no copy for — this is the last place a system
  // failure can reach the person instead of crashing the page.
  it('shows a system-failure banner when the action throws', async () => {
    resetPasswordAction.mockRejectedValue(new Error('boom'))
    render(React.createElement(ResetPasswordForm, { token: 'tok-123' }))

    fill('abcd1234', 'abcd1234')
    submit()

    expect(await screen.findByText(/Có lỗi hệ thống/)).toBeTruthy()
  })
})
