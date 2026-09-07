import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import React from 'react'

import NotFound from '@/app/(frontend)/not-found'

afterEach(cleanup)

describe('NotFound component (404 page)', () => {
  it('renders the 404 visual indicator and Vietnamese heading', () => {
    render(<NotFound />)

    expect(screen.getByText('404')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: /Không tìm thấy trang/i })).toBeTruthy()
    expect(screen.getByText(/Địa chỉ bạn đang tìm kiếm không tồn tại/i)).toBeTruthy()
  })

  it('provides navigation links to home and course catalog', () => {
    render(<NotFound />)

    const homeLink = screen.getByRole('link', { name: /Về trang chủ/i })
    expect(homeLink).toBeTruthy()
    expect(homeLink.getAttribute('href')).toBe('/')

    const coursesLink = screen.getByRole('link', { name: /Khám phá khóa học/i })
    expect(coursesLink).toBeTruthy()
    expect(coursesLink.getAttribute('href')).toBe('/khoa-hoc')
  })

  it('does not leak any stack trace or debug information', () => {
    const { container } = render(<NotFound />)

    expect(container.textContent).not.toContain('stack')
    expect(container.textContent).not.toContain('Error:')
    expect(container.textContent).not.toContain('TypeError')
  })
})
