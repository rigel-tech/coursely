'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'
import { CMSLink } from '@/components/public/Link'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const pathname = usePathname()
  const navItems = data?.navItems || []

  if (!navItems.length) return null

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map(({ link, id }, i) => {
        if (!link) return null

        let href = link.url
        if (
          typeof link.reference?.value === 'object' &&
          link.reference.value &&
          'slug' in link.reference.value &&
          link.reference.value.slug
        ) {
          const doc = link.reference.value
          const relation = link.reference.relationTo
          href =
            relation === 'pages'
              ? doc.slug === 'home'
                ? '/'
                : `/${doc.slug}`
              : `/${relation}/${doc.slug}`
        }

        // Nếu là link nội bộ nhưng trang đích đã bị xoá, bỏ qua an toàn
        if (!href) return null

        const isActive =
          href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

        return (
          <CMSLink
            key={id || i}
            {...link}
            appearance="inline"
            className={
              isActive
                ? 'bg-muted/80 text-foreground font-semibold rounded-lg px-3 py-1.5 text-sm transition-colors'
                : 'text-muted-foreground hover:text-foreground font-medium px-3 py-1.5 text-sm transition-colors'
            }
          />
        )
      })}
    </nav>
  )
}
