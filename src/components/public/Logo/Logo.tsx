import clsx from 'clsx'
import React from 'react'
import type { Media } from '@/payload-types'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  logo?: Media | null
  siteName?: string | null
  tagline?: string | null
  taglineClassName?: string
}

export const Logo: React.FC<Props> = ({ className, logo, siteName, tagline, taglineClassName }) => {
  const logoUrl = logo?.url

  return (
    <div className={clsx('flex min-w-0 items-center gap-2.5 select-none', className)}>
      {/* Nếu có tải ảnh lên thì hiện ảnh, nếu không có thì hiện ô icon SE mặc định */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={siteName || ''}
          className="max-h-9 w-auto object-contain rounded-md"
        />
      ) : null}
      {/* Cụm Tên thương hiệu + Khẩu hiệu bên phải */}
      <div className="flex min-w-0 flex-col text-left">
        <span className="truncate text-base font-extrabold tracking-tight text-foreground leading-none">
          {siteName}
        </span>
        <span
          className={clsx(
            'truncate text-[10px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight mt-0.5',
            taglineClassName,
          )}
        >
          {tagline}
        </span>
      </div>
    </div>
  )
}

export default Logo
