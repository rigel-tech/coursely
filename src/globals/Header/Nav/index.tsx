'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'
import { CMSLink } from '@/components/public/Link'

interface HeaderNavProps {
  data: HeaderType
  isMobile?: boolean
  onMobileSelect?: () => void
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ data, isMobile = false, onMobileSelect }) => {
  const pathname = usePathname()
  const navItems = data?.navItems || []

  if (!navItems.length) return null

  if (isMobile) {
    return (
      <nav className="flex flex-col gap-1 py-1">
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

          if (!href) return null

          const isActive =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

          return (
            <div key={id || i} onClick={onMobileSelect}>
              <CMSLink
                {...link}
                appearance="inline"
                className={
                  isActive
                    ? 'flex items-center w-full bg-primary/10 text-primary font-semibold rounded-lg px-3.5 py-2.5 text-base transition-colors'
                    : 'flex items-center w-full text-foreground hover:bg-muted/80 font-medium rounded-lg px-3.5 py-2.5 text-base transition-colors'
                }
              />
            </div>
          )
        })}
      </nav>
    )
  }

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
