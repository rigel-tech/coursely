import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Media, SiteSetting } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { DEFAULT_LOGO_SHORT, DEFAULT_SITE_NAME, DEFAULT_TAGLINE } from '@/lib/constants/site'

export const Logo: React.FC = async () => {
  let siteSettings: SiteSetting | null = null
  try {
    siteSettings = await getCachedGlobal('site-settings', 1)()
  } catch (err) {
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error({ err }, 'Failed to fetch site-settings for Admin Logo')
    } catch {
      console.error('Failed to fetch site-settings for Admin Logo', err)
    }
  }
  const logo = siteSettings?.logo as Media | undefined

  if (logo?.url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
        <img
          src={logo.url}
          alt={siteSettings?.siteName || DEFAULT_SITE_NAME}
          style={{ maxHeight: '36px', width: 'auto', objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, fontSize: '16px', lineHeight: 1 }}>
            {siteSettings?.siteName || DEFAULT_SITE_NAME}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.7, marginTop: '2px' }}>
            {siteSettings?.tagline || DEFAULT_TAGLINE}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'var(--brand-accent)',
          color: 'var(--primary-foreground)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '14px',
        }}
      >
        {DEFAULT_LOGO_SHORT}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 800, fontSize: '16px', lineHeight: 1 }}>
          {siteSettings?.siteName || DEFAULT_SITE_NAME}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.7, marginTop: '2px' }}>
          {siteSettings?.tagline || DEFAULT_TAGLINE}
        </span>
      </div>
    </div>
  )
}

export default Logo
