import type { Payload } from 'payload'
import { getOrCreateMedia, heading, lexicalDoc, paragraph } from './lexical'

const FORM_FIELDS = [
  {
    blockType: 'text',
    name: 'fullname',
    label: 'Họ và tên',
    defaultValue: 'Nguyễn Minh Anh',
    width: 50,
    required: true,
  },
  {
    blockType: 'text',
    name: 'phone',
    label: 'Số điện thoại',
    defaultValue: '09xxxxxxxxx',
    width: 50,
    required: true,
  },
  {
    blockType: 'email',
    name: 'email',
    label: 'Email',
    defaultValue: 'example@gmail.com',
    width: 100,
    required: true,
  },
  {
    blockType: 'select',
    name: 'course',
    label: 'Khóa học / Chủ đề quan tâm',
    defaultValue: '',
    width: 50,
    required: false,
    options: [
      {
        label: 'Chuyển Đổi Số Toàn Diện Cho Doanh Nghiệp',
        value: 'Chuyển Đổi Số Toàn Diện Cho Doanh Nghiệp',
      },
      {
        label: 'Ứng Dụng GenAI & ChatGPT Tối Ưu Hiệu Suất',
        value: 'Ứng Dụng GenAI & ChatGPT Tối Ưu Hiệu Suất',
      },
      {
        label: 'Tự Động Hóa Quy Trình Với No-Code / Zapier',
        value: 'Tự Động Hóa Quy Trình Với No-Code / Zapier',
      },
      {
        label: 'Phân Tích Dữ Liệu Kinh Doanh (Power BI & SQL)',
        value: 'Phân Tích Dữ Liệu Kinh Doanh (Power BI & SQL)',
      },
      {
        label: 'Quản Trị Dự Án Số & Tư Duy Agile/Scrum',
        value: 'Quản Trị Dự Án Số & Tư Duy Agile/Scrum',
      },
      {
        label: 'Bảo Mật Thông Tin & Quản Trị Rủi Ro Dữ Liệu',
        value: 'Bảo Mật Thông Tin & Quản Trị Rủi Ro Dữ Liệu',
      },
    ],
  },
  {
    blockType: 'select',
    name: 'time',
    label: 'Hình thức & Thời gian học mong muốn',
    defaultValue: '',
    width: 50,
    required: false,
    options: [
      { label: 'Tối 2-4-6 (19h30–21h00)', value: 'Tối 2-4-6 (19h30–21h00)' },
      { label: 'Tối 3-5-7 (19h30–21h00)', value: 'Tối 3-5-7 (19h30–21h00)' },
      { label: 'Cuối tuần Thứ 7 & CN', value: 'Cuối tuần Thứ 7 & CN' },
      {
        label: 'Đào tạo In-house theo yêu cầu doanh nghiệp',
        value: 'Đào tạo In-house theo yêu cầu doanh nghiệp',
      },
      { label: 'Linh hoạt theo lịch cá nhân', value: 'Linh hoạt theo lịch cá nhân' },
    ],
  },
  {
    blockType: 'textarea',
    name: 'message',
    label: 'Nhu cầu chuyển đổi số hoặc mục tiêu đào tạo của bạn',
    defaultValue: '',
    width: 100,
    required: false,
  },
  {
    blockType: 'checkbox',
    name: 'agreement',
    label: 'Tôi đồng ý để Coursely liên hệ tư vấn theo Chính sách bảo mật.',
    width: 100,
    required: false,
  },
]

async function getOrCreateConsultationForm(payload: Payload): Promise<string | number> {
  const existingForms = await payload.find({
    collection: 'forms',
    where: { title: { equals: 'Đăng ký tư vấn chuyển đổi số' } },
    limit: 1,
  })

  if (existingForms.docs.length > 0) {
    payload.logger.info(`Form tư vấn đã tồn tại (ID: ${existingForms.docs[0].id})`)
    return existingForms.docs[0].id
  }

  const confirmationMessage = lexicalDoc([
    heading('Đăng ký tư vấn thành công!', 'h3'),
    paragraph(
      'Cảm ơn bạn đã quan tâm. Chuyên viên tư vấn giải pháp của Coursely sẽ liên hệ lại với bạn trong vòng 24 giờ làm việc.',
    ),
  ])

  const form = await payload.create({
    collection: 'forms',
    data: {
      title: 'Đăng ký tư vấn chuyển đổi số',
      fields: FORM_FIELDS as any,
      submitButtonLabel: 'Gửi yêu cầu tư vấn ngay',
      confirmationType: 'message',
      confirmationMessage: confirmationMessage as any,
    },
  })

  payload.logger.info(`Đã tạo Form tư vấn (ID: ${form.id})`)
  return form.id
}

export async function seedHome(payload: Payload): Promise<number | undefined> {
  const formId = await getOrCreateConsultationForm(payload)

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
    heading('Đột phá năng suất & Chuyển đổi số toàn diện cùng Coursely', 'h1'),
    paragraph(
      'Nâng tầm năng lực quản trị, tự động hóa quy trình và làm chủ công nghệ GenAI & Phân tích dữ liệu thực chiến cùng các chuyên gia hàng đầu.',
    ),
  ])

  const ctaRichText = lexicalDoc([
    heading('Sẵn sàng bứt phá chuyển đổi số ngay hôm nay?', 'h3'),
    paragraph(
      'Khám phá ngay các khóa học chuyên sâu được thiết kế tối ưu cho cá nhân và doanh nghiệp trong kỷ nguyên số.',
    ),
  ])

  const heroImageId = await getOrCreateMedia(
    payload,
    'public/images/hero-home.jpg',
    'Coursely Digital Transformation Academy',
  )

  const ctaLink = {
    link: {
      type: 'custom',
      url: '/khoa-hoc',
      label: 'Xem các khóa học',
      appearance: 'default',
    },
  }

  const consultationBlock = {
    blockType: 'consultation',
    badge: 'ĐĂNG KÝ TƯ VẤN',
    title: 'Nhận lộ trình chuyển đổi số & đào tạo trong 24 giờ',
    description:
      'Để lại thông tin, chuyên viên sẽ liên hệ khảo sát nhu cầu, đánh giá mức độ sẵn sàng số hóa và đề xuất chương trình đào tạo tối ưu.',
    steps: [
      { text: 'Khảo sát & đánh giá mức độ sẵn sàng chuyển đổi số' },
      { text: 'Thiết kế lộ trình đào tạo thực chiến theo nghiệp vụ thực tế' },
      { text: 'Tham gia workshop trải nghiệm thực hành trước khi triển khai chính thức' },
    ],
    note: 'Học phí và ưu đãi đào tạo doanh nghiệp được tư vấn và xác nhận chi tiết sau khi thống nhất lộ trình.',
    form: formId,
    hotline: '1900 6789',
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
        type: heroImageId ? 'mediumImpact' : 'lowImpact',
        richText: heroRichText,
        ...(heroImageId && { media: heroImageId }),
        links: [ctaLink],
      },
      layout: [
        consultationBlock,
        {
          blockType: 'cta',
          richText: ctaRichText,
          links: [
            {
              link: {
                type: 'custom',
                url: '/khoa-hoc',
                label: 'Khám phá tất cả khóa học',
                appearance: 'default',
              },
            },
          ],
        },
      ],
      meta: {
        title: 'Coursely — Nền tảng Đào tạo Số hóa & Chuyển đổi số Doanh nghiệp',
        description:
          'Đào tạo chuyển đổi số, GenAI, tự động hóa quy trình No-Code và phân tích dữ liệu kinh doanh thực chiến.',
      },
    } as any,
  })

  payload.logger.info(`Đã tạo Trang chủ (ID: ${page.id})`)
  return page.id
}
