import type { Payload } from 'payload'
import { heading, lexicalDoc, list, paragraph } from './lexical'

export async function seedAbout(payload: Payload): Promise<string | number | null> {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'gioi-thieu' } },
    limit: 1,
  })
  if (existing.docs.length > 0) {
    payload.logger.info(`Trang Giới thiệu đã tồn tại (ID: ${existing.docs[0].id})`)
    return existing.docs[0].id
  }

  const heroRichText = lexicalDoc([
    heading('Kiến tạo tương lai với kỹ năng thực chiến cùng SpeakEdge', 'h1'),
    paragraph(
      'SpeakEdge là nền tảng đào tạo tiếng Anh công sở hàng đầu, kết nối học viên với các chuyên gia đầu ngành thông qua lộ trình học tinh gọn và môi trường thực chiến quốc tế.',
    ),
  ])

  const col1 = lexicalDoc([
    heading('Câu chuyện của SpeakEdge', 'h3'),
    paragraph(
      'Được thành lập với mục tiêu xóa bỏ rào cản ngôn ngữ nơi công sở, SpeakEdge mang đến môi trường học tập linh hoạt, hiện đại và chuẩn quốc tế.',
    ),
    heading('Sứ mệnh của chúng tôi:', 'h4'),
    list([
      'Cung cấp các chương trình đào tạo bám sát thực tế giao tiếp doanh nghiệp.',
      'Giúp học viên làm chủ kỹ năng thuyết trình, đàm phán và viết email chuyên nghiệp.',
      'Đồng hành và hỗ trợ giải đáp 1:1 trong suốt quá trình học tập.',
    ]),
  ])

  const col2 = lexicalDoc([
    heading('Tầm nhìn & Giá trị cốt lõi', 'h3'),
    paragraph(
      'Chúng tôi hướng tới trở thành hệ sinh thái học tập số hàng đầu khu vực, nơi bất kỳ ai cũng có thể nâng tầm sự nghiệp một cách bền vững.',
    ),
    heading('4 Giá trị cốt lõi:', 'h4'),
    list(
      [
        'Thực chiến đi đầu: Học từ tình huống thật, ứng dụng ngay vào công việc.',
        'Giảng viên chuyên gia: Đội ngũ Mentor từ các tập đoàn đa quốc gia.',
        'Học tập linh hoạt: Lịch học phù hợp tối đa với người đi làm bận rộn.',
        'Cam kết chất lượng: Hỗ trợ trọn đời và mở rộng cơ hội thăng tiến.',
      ],
      'number',
    ),
  ])

  const media = await payload.find({ collection: 'media', limit: 1 })
  const mediaId = media.docs[0]?.id
  const col = (richText: unknown) => ({
    size: 'half' as const,
    cardStyle: 'none' as const,
    textColor: 'default' as const,
    richText: richText as never,
  })

  const page = await payload.create({
    collection: 'pages',
    context: { disableRevalidate: true },
    draft: false,
    data: {
      title: 'Giới thiệu',
      slug: 'gioi-thieu',
      _status: 'published',
      hero: {
        type: mediaId ? ('mediumImpact' as const) : ('lowImpact' as const),
        richText: heroRichText as never,
        ...(mediaId && { media: mediaId }),
        links: [],
      },
      layout: [
        {
          blockType: 'content' as const,
          background: 'none' as const,
          columns: [col(col1), col(col2)],
        },
        {
          blockType: 'cta' as const,
          richText: lexicalDoc([
            heading('Sẵn sàng bứt phá sự nghiệp cùng SpeakEdge?', 'h3'),
            paragraph('Khám phá ngay các khóa học chất lượng cao.'),
          ]) as never,
          links: [
            {
              link: {
                type: 'custom' as const,
                url: '/khoa-hoc',
                label: 'Khám phá khóa học',
                appearance: 'default' as const,
              },
            },
          ],
        },
      ],
      meta: {
        title: 'Giới thiệu về SpeakEdge — Nền tảng Đào tạo Tiếng Anh Thực Chiến',
        description: 'Tìm hiểu về sứ mệnh, tầm nhìn và đội ngũ giảng viên tại SpeakEdge.',
      },
    } as never,
  })

  payload.logger.info(`Đã tạo Trang Giới thiệu (ID: ${page.id})`)
  return page.id
}
