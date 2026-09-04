'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

import type { Header } from '@/payload-types'
import { Logo } from '@/components/public/Logo/Logo'
import { HeaderAuthControls } from '@/components/public/HeaderAuthControls'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import useIsHydrated from '@/utilities/useIsHydrated'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

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
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Left: SpeakEdge Logo */}
        <Link href="/" className="shrink-0 flex items-center">
          <Logo />
        </Link>

        {/* Center: Navigation Links */}
        <HeaderNav data={data} />

        {/* Right: Hotline + Auth Controls + Theme Toggle */}
        <HeaderAuthControls />
      </div>
    </header>
  )
}
