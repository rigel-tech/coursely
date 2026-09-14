import type { Payload } from 'payload'

export async function seedSiteSettings(payload: Payload) {
  const existing = await payload.findGlobal({ slug: 'site-settings' })
  if (existing?.siteName) return payload.logger.info('Site Settings sẵn sàng.')

  await payload.updateGlobal({
    slug: 'site-settings',
    context: { disableRevalidate: true },
    data: { siteName: 'SpeakEdge', tagline: 'Anh ngữ công sở thực chiến' },
  })
  payload.logger.info('Đã khởi tạo Site Settings.')
}
