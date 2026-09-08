import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Header as HeaderType } from '@/payload-types'
import { HeaderNav } from '@/Header/Nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/khoa-hoc',
}))

afterEach(cleanup)

describe('HeaderNav', () => {
  it('does not render hardcoded fallback menu when navItems is empty', () => {
    const data = { navItems: [] } as unknown as HeaderType
    const { container } = render(<HeaderNav data={data} />)

    expect(screen.queryByText('Trang chủ')).toBeNull()
    expect(screen.queryByText('Tin tức')).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('renders top-level navigation links from Payload data', () => {
    const data = {
      navItems: [
        {
          link: {
            type: 'custom',
            label: 'Trang chủ',
            url: '/',
          },
        },
        {
          link: {
            type: 'custom',
            label: 'Khóa học',
            url: '/khoa-hoc',
          },
        },
      ],
    } as unknown as HeaderType

    render(<HeaderNav data={data} />)

    expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Khóa học' })).toBeTruthy()
  })

  it('renders sub-menu items (dropdown) and supports open in new tab', () => {
    const data = {
      navItems: [
        {
          link: {
            type: 'custom',
            label: 'Khóa học',
            url: '/khoa-hoc',
          },
          subMenuItems: [
            {
              link: {
                type: 'custom',
                label: 'Lập trình Web',
                url: '/khoa-hoc/web',
                newTab: true,
              },
            },
            {
              link: {
                type: 'custom',
                label: 'Mobile App',
                url: '/khoa-hoc/mobile',
              },
            },
          ],
        },
      ],
    } as unknown as HeaderType

    render(<HeaderNav data={data} />)

    // Initially dropdown items may not be visible until clicked or hovered
    const toggleButton = screen.getByRole('button', { name: /Mở menu con/i })
    expect(toggleButton).toBeTruthy()

    // Click to open dropdown
    fireEvent.click(toggleButton)

    const subLink1 = screen.getByRole('link', { name: 'Lập trình Web' })
    expect(subLink1).toBeTruthy()
    expect(subLink1.getAttribute('href')).toBe('/khoa-hoc/web')
    expect(subLink1.getAttribute('target')).toBe('_blank')
    expect(subLink1.getAttribute('rel')).toBe('noopener noreferrer')

    const subLink2 = screen.getByRole('link', { name: 'Mobile App' })
    expect(subLink2).toBeTruthy()
    expect(subLink2.getAttribute('href')).toBe('/khoa-hoc/mobile')
    expect(subLink2.getAttribute('target')).toBeNull()
  })

  it('handles deleted internal reference gracefully without crashing', () => {
    const data = {
      navItems: [
        {
          link: {
            type: 'reference',
            label: 'Trang đã bị xoá',
            reference: {
              relationTo: 'pages',
              value: null, // Deleted reference
            },
          },
        },
        {
          link: {
            type: 'reference',
            label: 'Khóa học React',
            reference: {
              relationTo: 'pages',
              value: {
                slug: 'khoa-hoc-react',
              },
            },
          },
        },
      ],
    } as unknown as HeaderType

    render(<HeaderNav data={data} />)

    const brokenLink = screen.getByRole('link', { name: 'Trang đã bị xoá' })
    expect(brokenLink).toBeTruthy()
    expect(brokenLink.getAttribute('href')).toBe('#')

    const validLink = screen.getByRole('link', { name: 'Khóa học React' })
    expect(validLink).toBeTruthy()
    expect(validLink.getAttribute('href')).toBe('/khoa-hoc-react')
  })
})
