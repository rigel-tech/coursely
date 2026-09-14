import type { Payload } from 'payload'
import { heading, lexicalDoc, paragraph } from './lexical'

export async function seedHome(payload: Payload): Promise<string | number | null> {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
  })
  if (existing.docs.length > 0) {
    payload.logger.info(`Trang chủ đã tồn tại (ID: ${existing.docs[0].id})`)
    return existing.docs[0].id
  }

  const heroRichText = lexicalDoc([
    heading('Nâng tầm sự nghiệp cùng SpeakEdge — Anh ngữ công sở chuẩn thực chiến', 'h1'),
    paragraph(
      'Đột phá kỹ năng giao tiếp tiếng Anh trong môi trường làm việc quốc tế. Học cùng chuyên gia với lộ trình tinh gọn, ứng dụng ngay vào công việc thực tế.',
    ),
  ])

  const ctaRichText = lexicalDoc([
    heading('Sẵn sàng bứt phá sự nghiệp ngay hôm nay?', 'h3'),
    paragraph(
      'Khám phá ngay các khóa học được thiết kế chuyên biệt cho người đi làm và doanh nghiệp.',
    ),
  ])

  const media = await payload.find({ collection: 'media', limit: 1 })
  const mediaId = media.docs[0]?.id
  const ctaLink = {
    link: {
      type: 'custom' as const,
      url: '/khoa-hoc',
      label: 'Xem các khóa học',
      appearance: 'default' as const,
    },
  }

  const page = await payload.create({
    collection: 'pages',
    context: { disableRevalidate: true },
    draft: false,
    data: {
      title: 'Trang chủ',
      slug: 'home',
      _status: 'published',
      hero: {
        type: mediaId ? ('mediumImpact' as const) : ('lowImpact' as const),
        richText: heroRichText as never,
        ...(mediaId && { media: mediaId }),
        links: [ctaLink],
      },
      layout: [
        {
          blockType: 'cta' as const,
          richText: ctaRichText as never,
          links: [
            {
              link: {
                type: 'custom' as const,
                url: '/khoa-hoc',
                label: 'Khám phá tất cả khóa học',
                appearance: 'default' as const,
              },
            },
          ],
        },
      ],
      meta: {
        title: 'SpeakEdge — Nền tảng Đào tạo Tiếng Anh Công Sở & Doanh Nghiệp',
        description:
          'Học tiếng Anh công sở thực chiến, nâng tầm kỹ năng giao tiếp, thuyết trình và đàm phán quốc tế.',
      },
    } as never,
  })

  payload.logger.info(`Đã tạo Trang chủ (ID: ${page.id})`)
  return page.id
}
