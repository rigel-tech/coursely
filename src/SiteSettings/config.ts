import type { GlobalConfig } from 'payload'
import { revalidateSiteSettings } from './hooks/revalidateSiteSettings'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: 'Tên website / Thương hiệu',
      defaultValue: 'SPEAKEDGE',
    },
    {
      name: 'tagline',
      type: 'text',
      label: 'Khẩu hiệu (Tagline)',
      defaultValue: 'Anh ngữ công sở',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo chính',
      admin: {
        description:
          'Logo hiển thị tại Header, Footer và màn hình Admin. Hỗ trợ SVG, PNG, WEBP (Tối đa 2MB).',
      },
      filterOptions: {
        mimeType: { in: ['image/svg+xml', 'image/png', 'image/webp'] },
      },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      label: 'Favicon trình duyệt',
      admin: {
        description: 'Biểu tượng tab trình duyệt. Hỗ trợ ICO, SVG, PNG, WEBP (Tối đa 1MB).',
      },
      filterOptions: {
        mimeType: {
          in: [
            'image/x-icon',
            'image/vnd.microsoft.icon',
            'image/svg+xml',
            'image/png',
            'image/webp',
          ],
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
}
