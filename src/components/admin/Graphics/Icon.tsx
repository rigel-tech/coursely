import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Media, SiteSetting } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { DEFAULT_LOGO_SHORT } from '@/lib/constants/site'

export const Icon: React.FC = async () => {
  let siteSettings: SiteSetting | null = null
  try {
    siteSettings = await getCachedGlobal('site-settings', 1)()
  } catch (err) {
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error({ err }, 'Failed to fetch site-settings for Admin Icon')
    } catch {
      console.error('Failed to fetch site-settings for Admin Icon', err)
    }
  }

  const favicon = siteSettings?.favicon as Media | undefined
  const logo = siteSettings?.logo as Media | undefined
  const iconUrl = favicon?.url || logo?.url

  if (iconUrl) {
    return (
      /* 3. Dùng <img> thay vì next/image vì: icon kích thước nhỏ (24px), hỗ trợ SVG không overhead, tránh request /_next/image trên mọi trang admin */
      <img
        src={iconUrl}
        alt="Icon"
        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
      />
    )
  }

  return (
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
  )
}

export default Icon
