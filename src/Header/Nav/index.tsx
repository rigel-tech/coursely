'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type { Header as HeaderType } from '@/payload-types'
import { cn } from '@/utilities/ui'

type LinkField = {
  type?: 'custom' | 'reference' | null
  url?: string | null
  label?: string | null
  newTab?: boolean | null
  reference?: {
    relationTo?: string | null
    value?:
      | {
          slug?: string | null
        }
      | string
      | number
      | null
  } | null
}

type SubMenuItem = {
  link?: LinkField | null
  id?: string | null
}

type NavItem = {
  link?: LinkField | null
  subMenuItems?: SubMenuItem[] | null
  id?: string | null
}

function getLinkHref(link?: LinkField | null): string {
  if (!link) return '#'
  if (link.type === 'custom' && link.url) return link.url
  if (link.type === 'reference' && link.reference?.value) {
    if (typeof link.reference.value === 'object' && link.reference.value.slug) {
      const relationTo = link.reference.relationTo
      return `${relationTo && relationTo !== 'pages' ? `/${relationTo}` : ''}/${link.reference.value.slug}`
    }
  }
  return link.url || '#'
}

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const pathname = usePathname()
  const navItems = (data?.navItems ?? []) as NavItem[]
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null)
  const [prevPathname, setPrevPathname] = useState(pathname)
  const navRef = useRef<HTMLElement>(null)

  // Reset dropdown state when pathname changes during render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setOpenDropdownIndex(null)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdownIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!navItems || navItems.length === 0) {
    return null
  }

  return (
    <nav ref={navRef} className="hidden md:flex items-center gap-1">
      {navItems.map((item, index) => {
        const { link, subMenuItems } = item
        if (!link) return null

        const href = getLinkHref(link)
        const hasSubMenu = Array.isArray(subMenuItems) && subMenuItems.length > 0
        const isParentActive =
          href !== '#' && (pathname === href || (href !== '/' && pathname.startsWith(href)))

        const isChildActive =
          hasSubMenu &&
          subMenuItems.some((sub) => {
            const subHref = getLinkHref(sub?.link)
            return (
              subHref !== '#' &&
              (pathname === subHref || (subHref !== '/' && pathname.startsWith(subHref)))
            )
          })

        const isActive = isParentActive || isChildActive
        const isOpen = openDropdownIndex === index

        const newTabProps = link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}

        if (!hasSubMenu) {
          return (
            <Link
              key={index}
              href={href}
              {...newTabProps}
              className={cn(
                'text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-muted/80 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              {link.label || 'Liên kết'}
            </Link>
          )
        }

        return (
          <div
            key={index}
            className="relative"
            onMouseEnter={() => setOpenDropdownIndex(index)}
            onMouseLeave={() => setOpenDropdownIndex(null)}
          >
            <div className="flex items-center">
              <Link
                href={href}
                {...newTabProps}
                className={cn(
                  'text-sm font-medium pl-3.5 pr-1 py-1.5 rounded-l-lg transition-colors inline-flex items-center',
                  isActive
                    ? 'bg-muted/80 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}
              >
                {link.label || 'Menu'}
              </Link>
              <button
                type="button"
                onClick={() => setOpenDropdownIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-label={`Mở menu con ${link.label || ''}`}
                className={cn(
                  'py-2 pr-2.5 pl-0.5 rounded-r-lg text-muted-foreground hover:text-foreground transition-colors flex items-center',
                  isActive ? 'bg-muted/80 text-primary' : 'hover:bg-muted/40',
                )}
              >
                <ChevronDown
                  className={cn(
                    'size-3.5 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </div>

            {/* Dropdown Popover */}
            {isOpen && (
              <div className="absolute left-0 top-full pt-1.5 z-50 min-w-[200px] animate-in fade-in-0 zoom-in-95">
                <div className="bg-popover border border-border rounded-lg shadow-lg p-1.5 flex flex-col gap-0.5 backdrop-blur-md">
                  {subMenuItems.map((subItem, subIndex) => {
                    const subLink = subItem?.link
                    if (!subLink) return null

                    const subHref = getLinkHref(subLink)
                    const isSubActive = subHref !== '#' && pathname === subHref
                    const subNewTabProps = subLink.newTab
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {}

                    return (
                      <Link
                        key={subIndex}
                        href={subHref}
                        {...subNewTabProps}
                        className={cn(
                          'text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between',
                          isSubActive
                            ? 'bg-muted text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium',
                        )}
                      >
                        <span>{subLink.label || 'Mục con'}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
