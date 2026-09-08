import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import React from 'react'

import NotFound from '@/app/(frontend)/not-found'

afterEach(cleanup)

describe('NotFound component (404 page)', () => {
  it('renders the 404 visual indicator and Vietnamese heading', () => {
    const { container } = render(<NotFound />)

    const visual404 = container.querySelector('span[aria-hidden="true"]')
    expect(visual404).toBeTruthy()
    expect(visual404?.textContent?.trim()).toBe('404')

    expect(screen.getByRole('heading', { level: 1, name: /Không tìm thấy trang/i })).toBeTruthy()
    expect(screen.getByText(/Địa chỉ bạn đang tìm kiếm không tồn tại, đã bị xóa/i)).toBeTruthy()
  })

  it('provides navigation links to home and course catalog with correct hrefs', () => {
    render(<NotFound />)

    const homeLink = screen.getByRole('link', { name: /Về trang chủ/i })
    expect(homeLink).toBeTruthy()
    expect(homeLink.getAttribute('href')).toBe('/')

    const coursesLink = screen.getByRole('link', { name: /Khám phá khóa học/i })
    expect(coursesLink).toBeTruthy()
    expect(coursesLink.getAttribute('href')).toBe('/khoa-hoc')
  })
})
