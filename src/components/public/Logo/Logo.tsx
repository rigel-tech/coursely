import clsx from 'clsx'
import React from 'react'
import type { Media } from '@/payload-types'
import { DEFAULT_LOGO_SHORT, DEFAULT_SITE_NAME, DEFAULT_TAGLINE } from '@/lib/constants/site'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  logo?: Media | null
  siteName?: string | null
  tagline?: string | null
}

export const Logo: React.FC<Props> = ({ className, logo, siteName, tagline }) => {
  const logoUrl = logo?.url

  return (
    <div className={clsx('flex items-center gap-2.5 select-none', className)}>
      {/* Nếu có tải ảnh lên thì hiện ảnh, nếu không có thì hiện ô icon SE mặc định */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={siteName || DEFAULT_SITE_NAME}
          className="max-h-9 w-auto object-contain rounded-md"
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm tracking-tighter shadow-xs">
          {DEFAULT_LOGO_SHORT}
        </div>
      )}

      {/* Cụm Tên thương hiệu + Khẩu hiệu bên phải */}
      <div className="flex flex-col text-left">
        <span className="text-base font-extrabold tracking-tight text-foreground leading-none">
          {siteName || DEFAULT_SITE_NAME}
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight mt-0.5">
          {tagline || DEFAULT_TAGLINE}
        </span>
      </div>
    </div>
  )
}
