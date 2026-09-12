import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { Header } from '@/payload-types'

let currentPath = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
}))

const { HeaderNav } = await import('@/globals/Header/Nav')

afterEach(cleanup)

describe('HeaderNav', () => {
  it('maps home page slug to / and highlights active item', () => {
    currentPath = '/'
    const data: Header = {
      id: 1,
      navItems: [
        {
          id: '1',
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: { slug: 'home' } as any,
            },
            label: 'Trang chủ',
          },
        },
        {
          id: '2',
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: { slug: 'khoa-hoc' } as any,
            },
            label: 'Khóa học',
          },
        },
      ],
    }

    render(<HeaderNav data={data} />)

    const homeLink = screen.getByRole('link', { name: 'Trang chủ' })
    const coursesLink = screen.getByRole('link', { name: 'Khóa học' })

    expect(homeLink.getAttribute('href')).toBe('/')
    expect(homeLink.className).toContain('font-semibold')
    expect(homeLink.className).toContain('text-foreground')

    expect(coursesLink.getAttribute('href')).toBe('/khoa-hoc')
    expect(coursesLink.className).toContain('text-muted-foreground')
  })

  it('prefixes posts relation with /posts', () => {
    currentPath = '/posts/bai-viet-1'
    const data: Header = {
      id: 1,
      navItems: [
        {
          id: '1',
          link: {
            type: 'reference',
            reference: {
              relationTo: 'posts',
              value: { slug: 'bai-viet-1' } as any,
            },
            label: 'Bài viết 1',
          },
        },
      ],
    }

    render(<HeaderNav data={data} />)

    const postLink = screen.getByRole('link', { name: 'Bài viết 1' })
    expect(postLink.getAttribute('href')).toBe('/posts/bai-viet-1')
    expect(postLink.className).toContain('text-foreground')
  })

  it('does not falsely activate sibling prefixes', () => {
    currentPath = '/khoa-hoc-abc'
    const data: Header = {
      id: 1,
      navItems: [
        {
          id: '1',
          link: {
            type: 'custom',
            url: '/khoa-hoc',
            label: 'Khóa học',
          },
        },
      ],
    }

    render(<HeaderNav data={data} />)

    const coursesLink = screen.getByRole('link', { name: 'Khóa học' })
    expect(coursesLink.className).toContain('text-muted-foreground')
    expect(coursesLink.className).not.toContain('font-semibold')
  })

  it('gracefully skips items whose target document is null or missing', () => {
    const data: Header = {
      id: 1,
      navItems: [
        {
          id: '1',
          link: {
            type: 'reference',
            reference: {
              relationTo: 'pages',
              value: null as any,
            },
            label: 'Đã bị xóa',
          },
        },
      ],
    }

    render(<HeaderNav data={data} />)
    expect(screen.queryByRole('link', { name: 'Đã bị xóa' })).toBeNull()
  })
})
