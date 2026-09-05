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

describe('RegisterForm', () => {
  it('navigates to /xac-thuc-otp once the action reports success', async () => {
    registerAction.mockResolvedValue({ status: 'success' })
    render(React.createElement(RegisterForm))

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/xac-thuc-otp'))
  })

  // Guard: only 'success' navigates — an error state stays put and renders its message.
  it('stays on the page and shows the message when the action returns an error', async () => {
    registerAction.mockResolvedValue({
      status: 'error',
      code: 'AUTH_003',
      message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
    })
    render(React.createElement(RegisterForm))

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    expect(await screen.findByText(/Có lỗi hệ thống/)).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })
})
