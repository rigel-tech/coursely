import type { Payload } from 'payload'
import { getOrCreateMedia } from './lexical'

export async function seedSiteSettings(payload: Payload) {
  const [logoId, faviconId] = await Promise.all([
    getOrCreateMedia(payload, 'public/logo.svg', 'Coursely Logo'),
    getOrCreateMedia(payload, 'public/favicon.svg', 'Coursely Favicon'),
  ])

  await payload.updateGlobal({
    slug: 'site-settings',
    context: { disableRevalidate: true },
    data: {
      siteName: 'Coursely',
      tagline: 'Đào tạo Số hóa & Chuyển đổi số thực chiến',
      ...(logoId ? { logo: logoId } : {}),
      ...(faviconId ? { favicon: faviconId } : {}),
    },
  })
  payload.logger.info('Đã cập nhật Site Settings sang Coursely.')
}
