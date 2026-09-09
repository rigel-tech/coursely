import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Media, SiteSetting } from '@/payload-types'

export const Logo: React.FC = async () => {
  let siteSettings: SiteSetting | null = null
  try {
    const payload = await getPayload({ config: configPromise })
    siteSettings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  } catch {}

  const logo = siteSettings?.logo as Media | undefined

  if (logo?.url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
        <img
          src={logo.url}
          alt={siteSettings?.siteName || 'Logo'}
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'var(--theme-elevation-500, #ff5c00)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '14px',
        }}
      >
        SE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 800, fontSize: '16px', lineHeight: 1 }}>
          {siteSettings?.siteName || 'SPEAKEDGE'}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.7, marginTop: '2px' }}>
          {siteSettings?.tagline || 'Anh ngữ công sở'}
        </span>
      </div>
    </div>
  )
}

export default Logo
