import type { GlobalConfig } from 'payload'
import { revalidateSiteSettings } from './hooks/revalidateSiteSettings'
import { DEFAULT_SITE_NAME, DEFAULT_TAGLINE } from '@/lib/constants/site'
import { authenticated } from '@/access/authenticated'
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: 'Tên website / Thương hiệu',
      defaultValue: DEFAULT_SITE_NAME,
      required: true,
    },
    {
      name: 'tagline',
      type: 'text',
      label: 'Khẩu hiệu (Tagline)',
      defaultValue: DEFAULT_TAGLINE,
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo chính',
      admin: {
        description: 'Logo hiển thị tại Header, Footer và màn hình Admin.',
      },
      filterOptions: {
        mimeType: { in: ['image/png', 'image/webp', 'image/svg+xml'] },
      },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      label: 'Favicon trình duyệt',
      admin: {
        description: 'Biểu tượng tab trình duyệt (Khuyên dùng PNG, ICO, WEBP).',
      },
      filterOptions: {
        mimeType: {
          in: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/webp'],
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
}
