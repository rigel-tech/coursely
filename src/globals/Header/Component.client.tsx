'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header, Media, SiteSetting } from '@/payload-types'
import { Logo } from '@/components/public/Logo/Logo'
import { HeaderAuthControls } from '@/components/public/HeaderAuthControls'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import useIsHydrated from '@/utilities/useIsHydrated'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
  siteSettings?: SiteSetting | null
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data, siteSettings }) => {
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMobileMenuOpen(false)
  }

  const isHydrated = useIsHydrated()
  const theme = isHydrated ? headerTheme : null

  useEffect(() => {
    setHeaderTheme(null)
  }, [pathname, setHeaderTheme])

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
      {...(theme ? { 'data-theme': theme } : {})}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4">
        {/* Left: SpeakEdge Logo */}
        <Link href="/" className="shrink-0 flex items-center">
          <Logo
            logo={siteSettings?.logo as Media}
            siteName={siteSettings?.siteName}
            tagline={siteSettings?.tagline}
          />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <HeaderNav data={data} />

        {/* Right: Hotline + Auth Controls + Theme Toggle + Mobile Menu Button */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <HeaderAuthControls />
          <button
            type="button"
            className="inline-flex md:hidden items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="size-5 sm:size-6" />
            ) : (
              <Menu className="size-5 sm:size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-150 space-y-3">
          <HeaderNav data={data} isMobile onMobileSelect={() => setMobileMenuOpen(false)} />
          <HeaderAuthControls isMobile onSelect={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  )
}
