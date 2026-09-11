// The shared registration form, promoted out of `design/` the day RegisterCta took it.
//
// This is the only place its client-side rules are executed: typecheck reads its props and
// theme-guard reads its classes, but neither runs a validation pass. The contract that
// matters to every caller is the shape handed to `onSubmit` — one object, every field —
// because the server action now takes exactly that and nothing reshapes it in between.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RegisterForm } from '@/components/public/forms/register-form'

afterEach(cleanup)

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const fillAll = () => {
  fill('Họ và tên', 'Nguyễn Văn A')
  fill('Email', 'a@example.com')
  fill('Mật khẩu', 'abcd1234')
  fill('Nhập lại mật khẩu', 'abcd1234')
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

describe('RegisterForm', () => {
  it('no longer asks for terms consent', () => {
    render(<RegisterForm onSubmit={vi.fn()} />)

    expect(screen.queryByLabelText(/điều khoản/i)).toBeNull()
  })

  it('hands onSubmit a single object carrying every field', async () => {
    const onSubmit = vi.fn()
    render(<RegisterForm onSubmit={onSubmit} />)

    fillAll()
    submit()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      fullName: 'Nguyễn Văn A',
      email: 'a@example.com',
      password: 'abcd1234',
      confirmPassword: 'abcd1234',
    })
  })

  // Regression: `password()` in the old hand-rolled `validation.ts` rules checked only
  // length, while the server schema also demands a letter and a digit — a client that
  // accepted 'abcdefgh' left the server to reject it with no way for this form to show
  // which field or why. `registerSchema` (zod, shared with the server) closes that gap.
  it('rejects a password with no digit, the same rule the server enforces', async () => {
    const onSubmit = vi.fn()
    render(<RegisterForm onSubmit={onSubmit} />)

    fill('Họ và tên', 'Nguyễn Văn A')
    fill('Email', 'a@example.com')
    fill('Mật khẩu', 'abcdefgh')
    fill('Nhập lại mật khẩu', 'abcdefgh')
    submit()

    expect(await screen.findByText('Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses to submit when the two passwords differ', async () => {
    const onSubmit = vi.fn()
    render(<RegisterForm onSubmit={onSubmit} />)

    fillAll()
    fill('Nhập lại mật khẩu', 'abcd9999')
    submit()

    expect(
      await screen.findByText('Mật khẩu nhập lại không khớp với mật khẩu đã nhập'),
    ).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reports a rejected submission on the form instead of throwing', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Email này đã được đăng ký'))
    render(<RegisterForm onSubmit={onSubmit} />)

    fillAll()
    submit()

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Email này đã được đăng ký',
    )
  })
})
