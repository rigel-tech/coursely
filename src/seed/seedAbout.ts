import type { Payload } from 'payload'
import { getOrCreateMedia, heading, lexicalDoc, list, paragraph } from './lexical'

export async function seedAbout(payload: Payload): Promise<number | undefined> {
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
    heading('Tiên phong kiến tạo nguồn nhân lực số thực chiến cùng Coursely', 'h1'),
    paragraph(
      'Coursely là hệ sinh thái đào tạo chuyển đổi số hàng đầu, đồng hành cùng cá nhân và doanh nghiệp làm chủ công nghệ mới, tối ưu hóa quy trình và bứt phá năng suất trong kỷ nguyên số.',
    ),
  ])

  const col1 = lexicalDoc([
    heading('Câu chuyện của Coursely', 'h3'),
    paragraph(
      'Ra đời với sứ mệnh thu hẹp khoảng cách giữa lý thuyết công nghệ và thực tiễn vận hành doanh nghiệp, Coursely mang đến các chương trình đào tạo chuyển đổi số, GenAI và dữ liệu chuẩn thực chiến.',
    ),
    heading('Sứ mệnh của chúng tôi:', 'h4'),
    list([
      'Cung cấp các chương trình đào tạo số hóa bám sát thực tiễn vận hành doanh nghiệp.',
      'Trang bị kỹ năng làm chủ AI, phân tích dữ liệu và tự động hóa quy trình nghiệp vụ.',
      'Đồng hành và tư vấn chuyển đổi số 1:1 cùng đội ngũ chuyên gia đầu ngành.',
    ]),
  ])

  const col2 = lexicalDoc([
    heading('Tầm nhìn & Giá trị cốt lõi', 'h3'),
    paragraph(
      'Trở thành học viện chuyển đổi số và công nghệ ứng dụng uy tín hàng đầu khu vực, thúc đẩy làn sóng đổi mới sáng tạo và tối ưu hóa vận hành cho hàng ngàn doanh nghiệp.',
    ),
    heading('4 Giá trị cốt lõi:', 'h4'),
    list(
      [
        'Thực chiến đi đầu: 100% tình huống và dự án dựa trên bài toán kinh doanh thật.',
        'Chuyên gia dẫn dắt: Đội ngũ Giảng viên là các Giám đốc Công nghệ, Trưởng bộ phận Dữ liệu & AI.',
        'Học tập linh hoạt: Kết hợp workshop trực tiếp và hệ thống học liệu số hỗ trợ liên tục.',
        'Cam kết tạo giá trị: Đo lường hiệu quả chuyển đổi số và nâng cao năng suất rõ rệt sau khóa học.',
      ],
      'number',
    ),
  ])

  const heroImageId = await getOrCreateMedia(
    payload,
    'public/images/hero-about.jpg',
    'Coursely Digital Skills Academy',
  )

  const col = (richText: unknown) => ({
    size: 'half',
    cardStyle: 'none',
    textColor: 'default',
    richText,
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
        type: heroImageId ? 'mediumImpact' : 'lowImpact',
        richText: heroRichText,
        ...(heroImageId && { media: heroImageId }),
        links: [],
      },
      layout: [
        {
          blockType: 'content',
          background: 'none',
          columns: [col(col1), col(col2)],
        },
        {
          blockType: 'cta',
          richText: lexicalDoc([
            heading('Sẵn sàng bứt phá sự nghiệp và chuyển đổi số cùng Coursely?', 'h3'),
            paragraph('Khám phá ngay các khóa học chất lượng cao được thiết kế thực chiến.'),
          ]),
          links: [
            {
              link: {
                type: 'custom',
                url: '/khoa-hoc',
                label: 'Khám phá khóa học',
                appearance: 'default',
              },
            },
          ],
        },
      ],
      meta: {
        title: 'Giới thiệu về Coursely — Nền tảng Đào tạo Chuyển đổi số & AI Thực Chiến',
        description:
          'Tìm hiểu về sứ mệnh, tầm nhìn và đội ngũ chuyên gia chuyển đổi số tại Coursely.',
      },
    } as any,
  })

  payload.logger.info(`Đã tạo Trang Giới thiệu (ID: ${page.id})`)
  return page.id
}
