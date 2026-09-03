import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// RegisterForm calls useRouter() on render; no app-router context under jsdom.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import { RegisterCta } from '@/components/public/RegisterCta'

afterEach(cleanup)

describe('RegisterCta', () => {
  it('keeps the form out of the DOM until the button is clicked', () => {
    render(React.createElement(RegisterCta))

    expect(screen.queryByLabelText('Email')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))

    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Mật khẩu')).toBeTruthy()
    expect(screen.getByLabelText('Xác nhận mật khẩu')).toBeTruthy()
    expect(screen.getByLabelText('Họ và tên')).toBeTruthy()
    expect(screen.getByLabelText('Số điện thoại')).toBeTruthy()
    expect(screen.getByLabelText(/điều khoản/i)).toBeTruthy()
  })

  it('hides the form again on a second click', () => {
    render(React.createElement(RegisterCta))
    const toggle = screen.getByRole('button', { name: 'Đăng ký' })

    fireEvent.click(toggle)
    expect(screen.getByLabelText('Email')).toBeTruthy()

    fireEvent.click(toggle)
    expect(screen.queryByLabelText('Email')).toBeNull()
  })
})
