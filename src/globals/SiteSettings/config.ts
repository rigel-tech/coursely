import type { GlobalConfig } from 'payload'
import { adminGroups } from '@/lib/constants/adminGroups'
import { revalidateSiteSettings } from './hooks/revalidateSiteSettings'
import { authenticated } from '@/access/authenticated'
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: {
    vi: 'Cấu hình website',
    en: 'Site Settings',
  },
  admin: {
    group: adminGroups.configuration,
  },
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: { vi: 'Tên website / Thương hiệu', en: 'Site Name' },
      required: true,
    },
    {
      name: 'tagline',
      type: 'text',
      label: { vi: 'Khẩu hiệu (Tagline)', en: 'Tagline' },
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: { vi: 'Logo chính', en: 'Primary Logo' },
      admin: {
        description: {
          vi: 'Logo hiển thị tại Header, Footer và màn hình Admin.',
          en: 'Logo displayed in Header, Footer, and Admin panel.',
        },
      },
      filterOptions: {
        mimeType: { in: ['image/png', 'image/webp', 'image/svg+xml'] },
      },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      label: { vi: 'Favicon trình duyệt', en: 'Browser Favicon' },
      admin: {
        description: {
          vi: 'Biểu tượng tab trình duyệt (Khuyên dùng PNG, ICO, WEBP).',
          en: 'Browser tab icon (PNG, ICO, WEBP recommended).',
        },
      },
      filterOptions: {
        mimeType: {
          in: [
            'image/x-icon',
            'image/vnd.microsoft.icon',
            'image/png',
            'image/webp',
            'image/svg+xml',
          ],
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
}
