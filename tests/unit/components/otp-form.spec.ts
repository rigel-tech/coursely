import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/** Both actions run for real in tests/int; here we only drive their results. */
const verifyOtpAction = vi.fn()
vi.mock('@/actions/auth/verify-otp', () => ({
  verifyOtpAction: (...args: unknown[]) => verifyOtpAction(...args),
}))

const resendOtpAction = vi.fn()
vi.mock('@/actions/auth/resend-otp', () => ({
  resendOtpAction: (...args: unknown[]) => resendOtpAction(...args),
}))

const { OtpForm } = await import('@/app/(frontend)/user/verify-otp/OtpForm')

beforeEach(() => {
  verifyOtpAction.mockReset()
  resendOtpAction.mockReset()
  resendOtpAction.mockResolvedValue({ status: 'idle' })
})

afterEach(cleanup)

describe('OtpForm', () => {
  it('replaces the form with a confirmation once verification succeeds', async () => {
    verifyOtpAction.mockResolvedValue({ status: 'success' })
    render(React.createElement(OtpForm))

    fireEvent.change(screen.getByLabelText('Mã xác minh'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh' }))

    expect(await screen.findByText(/thành công/i)).toBeTruthy()
    expect(screen.queryByLabelText('Mã xác minh')).toBeNull()
  })

  it('keeps the form and shows the message when verification fails', async () => {
    verifyOtpAction.mockResolvedValue({
      status: 'error',
      message: 'Mã không đúng. Bạn còn 4 lần thử.',
    })
    render(React.createElement(OtpForm))

    fireEvent.change(screen.getByLabelText('Mã xác minh'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác minh' }))

    expect(await screen.findByText(/Mã không đúng/)).toBeTruthy()
    await waitFor(() => expect(screen.getByLabelText('Mã xác minh')).toBeTruthy())
  })
})
