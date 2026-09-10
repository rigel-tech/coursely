import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

import type { Media } from '@/payload-types'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/public/Link'
import { Logo } from '@/components/public/Logo/Logo'

export async function Footer() {
  const [footerData, siteSettings] = await Promise.all([
    getCachedGlobal('footer', 1)(),
    getCachedGlobal('site-settings', 1)().catch(() => null),
  ])

  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto border-t border-border bg-card text-card-foreground">
      <div className="container py-8 gap-8 flex flex-col md:flex-row md:justify-between">
        <Link className="flex items-center" href="/">
          <Logo
            logo={siteSettings?.logo as Media}
            siteName={siteSettings?.siteName}
            tagline={siteSettings?.tagline}
          />
        </Link>

        <div className="flex flex-col-reverse items-start md:flex-row gap-4 md:items-center">
          <ThemeSelector />
          <nav className="flex flex-col md:flex-row gap-4">
            {navItems.map(({ link }, i) => {
              return <CMSLink key={i} {...link} />
            })}
          </nav>
        </div>
      </div>
    </footer>
  )
}
