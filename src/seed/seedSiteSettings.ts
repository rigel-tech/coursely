import type { Payload } from 'payload'
import { getOrCreateMedia } from './lexical'

export async function seedSiteSettings(payload: Payload) {
  const existing = await payload.findGlobal({ slug: 'site-settings' })
  if (existing?.siteName && existing?.logo && existing?.favicon) {
    return payload.logger.info('Site Settings sẵn sàng.')
  }

  const [logoId, faviconId] = await Promise.all([
    getOrCreateMedia(payload, 'public/logo.svg', 'SpeakEdge Logo'),
    getOrCreateMedia(payload, 'public/favicon.svg', 'SpeakEdge Favicon'),
  ])

  await payload.updateGlobal({
    slug: 'site-settings',
    context: { disableRevalidate: true },
    data: {
      siteName: 'SpeakEdge',
      tagline: 'Anh ngữ công sở thực chiến',
      ...(logoId ? { logo: logoId } : {}),
      ...(faviconId ? { favicon: faviconId } : {}),
    },
  })
  payload.logger.info('Đã khởi tạo Site Settings.')
}
