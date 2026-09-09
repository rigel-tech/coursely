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
      {navItems.map(({ link }, i) => {
        if (!link) return null

        let href = link.url
        if (
          link.type === 'reference' &&
          typeof link.reference?.value === 'object' &&
          link.reference.value
        ) {
          const doc = link.reference.value
          const relation = link.reference.relationTo
          if ('slug' in doc && doc.slug) {
            href =
              relation === 'pages'
                ? doc.slug === 'home'
                  ? '/'
                  : `/${doc.slug}`
                : `/${relation}/${doc.slug}`
          }
        }

        // Nếu là link nội bộ nhưng trang đích đã bị xoá, bỏ qua an toàn
        if (!href) return null

        const isActive =
          href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

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
