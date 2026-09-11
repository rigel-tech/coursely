import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Media, SiteSetting } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'

export const Logo: React.FC = async () => {
  let siteSettings: SiteSetting | null = null
  try {
    siteSettings = await getCachedGlobal('site-settings', 1)()
  } catch (err) {
    const payload = await getPayload({ config: configPromise })
    payload.logger.error({ err }, 'Failed to fetch site-settings for Admin Logo')
  }
  const logo = siteSettings?.logo as Media | undefined

  if (logo?.url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
        <img
          src={logo.url}
          alt={siteSettings?.siteName}
          style={{ maxHeight: '36px', width: 'auto', objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, fontSize: '16px', lineHeight: 1 }}>
            {siteSettings?.siteName}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.7, marginTop: '2px' }}>
            {siteSettings?.tagline}
          </span>
        </div>
      </div>
    )
  }

  return null
}

export default Logo
