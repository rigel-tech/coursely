import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Media, SiteSetting } from '@/payload-types'

export const Icon: React.FC = async () => {
  let siteSettings: SiteSetting | null = null
  try {
    const payload = await getPayload({ config: configPromise })
    siteSettings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  } catch {}

  const favicon = siteSettings?.favicon as Media | undefined
  const logo = siteSettings?.logo as Media | undefined
  const iconUrl = favicon?.url || logo?.url

  if (iconUrl) {
    return (
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
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        background: 'var(--theme-elevation-500, #ff5c00)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: '11px',
      }}
    >
      SE
    </div>
  )
}

export default Icon
