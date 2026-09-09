import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

export async function Header() {
  const [headerData, siteSettings] = await Promise.all([
    getCachedGlobal('header', 1)(),
    getCachedGlobal('site-settings', 1)().catch(() => null),
  ])
  return <HeaderClient data={headerData} siteSettings={siteSettings} />
}
