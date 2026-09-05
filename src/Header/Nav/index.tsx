'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'
import { CMSLink } from '@/components/public/Link'

const DEFAULT_NAV = [
  { label: 'Trang chủ', url: '/' },
  { label: 'Khóa học', url: '/khoa-hoc' },
  { label: 'Tin tức', url: '/posts' },
  { label: 'Liên hệ', url: '/contact' },
]

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const pathname = usePathname()
  const navItems = data?.navItems || []

  if (navItems.length > 0) {
    return (
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map(({ link }, i) => {
          const href =
            link.url ||
            (typeof link.reference?.value === 'object' &&
            link.reference.value &&
            'slug' in link.reference.value
              ? `/${link.reference.value.slug}`
              : '#')
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

          return (
            <div
              key={i}
              className={
                isActive
                  ? 'bg-muted/80 text-primary font-semibold rounded-lg px-3 py-1.5 text-sm'
                  : 'text-muted-foreground hover:text-foreground font-medium px-3 py-1.5 text-sm transition-colors'
              }
            >
              <CMSLink {...link} appearance="link" className="no-underline hover:no-underline" />
            </div>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="hidden md:flex items-center gap-1">
      {DEFAULT_NAV.map((item) => {
        const isActive =
          item.url === '/'
            ? pathname === '/'
            : pathname === item.url || pathname.startsWith(`${item.url}/`)

        return (
          <Link
            key={item.url}
            href={item.url}
            className={`text-sm transition-colors px-3.5 py-1.5 rounded-lg ${
              isActive
                ? 'bg-muted/80 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
