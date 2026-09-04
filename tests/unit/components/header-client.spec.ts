import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { Header } from '@/payload-types'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/components/public/HeaderAuthControls', () => ({
  HeaderAuthControls: () => React.createElement('div', { 'data-testid': 'header-auth-controls' }),
}))

const { HeaderClient } = await import('@/Header/Component.client')

afterEach(cleanup)

const data = { navItems: [] } as unknown as Header

describe('HeaderClient', () => {
  it('delegates the sign-in / sign-out area to HeaderAuthControls', () => {
    render(React.createElement(HeaderClient, { data }))

    expect(screen.getByTestId('header-auth-controls')).toBeTruthy()
    // The header no longer renders the CTAs directly — HeaderAuthControls owns that slot.
    expect(screen.queryByRole('button', { name: /đăng nhập/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /đăng ký/i })).toBeNull()
  })
})
