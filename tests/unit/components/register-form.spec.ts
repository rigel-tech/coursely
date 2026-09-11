import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** The action is exercised for real elsewhere (tests/int); here we only drive its result. */
const registerAction = vi.fn()
vi.mock('@/actions/auth/register', () => ({
  registerAction: (...args: unknown[]) => registerAction(...args),
}))

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const { RegisterForm } = await import('@/components/public/RegisterCta/RegisterForm')

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

  // The action rethrows anything it has no copy for (rule: throw, never console.error), so
  // this is the last place a system failure can reach the person instead of crashing the page.
  it('shows a system-failure banner when the action throws', async () => {
    registerAction.mockRejectedValue(new Error('boom'))
    render(React.createElement(RegisterForm))

    fillAndSubmit()

    expect(await screen.findByText(/Có lỗi hệ thống/)).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })
})
