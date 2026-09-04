import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/actions/auth/login', () => ({ loginAction: vi.fn() }))

const { LoginCta } = await import('@/components/public/LoginCta')

afterEach(cleanup)

const toggle = (expanded: boolean) => screen.getByRole('button', { name: /đăng nhập/i, expanded })

describe('LoginCta', () => {
  it('keeps the form out of the DOM until the button is clicked', () => {
    render(React.createElement(LoginCta))

    expect(screen.queryByLabelText('Email')).toBeNull()

    fireEvent.click(toggle(false))

    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Mật khẩu')).toBeTruthy()
    expect(screen.getByLabelText('Ghi nhớ đăng nhập')).toBeTruthy()
  })

  it('hides the form again on a second click', () => {
    render(React.createElement(LoginCta))

    fireEvent.click(toggle(false))
    expect(screen.getByLabelText('Email')).toBeTruthy()

    fireEvent.click(toggle(true))
    expect(screen.queryByLabelText('Email')).toBeNull()
  })
})
