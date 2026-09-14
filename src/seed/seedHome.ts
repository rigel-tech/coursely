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
    blockType: 'number',
    name: 'phone',
    label: 'Số điện thoại',
    defaultValue: '0912345678',
    width: 50,
    required: true,
  },
  {
    blockType: 'email',
    name: 'email',
    label: 'Email',
    defaultValue: 'minhanh@congty.vn',
    width: 100,
    required: true,
  },
  {
    blockType: 'select',
    name: 'course',
    label: 'Khóa học quan tâm',
    defaultValue: '',
    width: 50,
    required: false,
    options: [
      { label: 'Tiếng Anh Giao Tiếp Doanh Nghiệp', value: 'Tiếng Anh Giao Tiếp Doanh Nghiệp' },
      { label: 'Luyện thi IELTS Cấp Tốc', value: 'Luyện thi IELTS Cấp Tốc' },
      { label: 'Kỹ Năng Thuyết Trình & Phỏng Vấn', value: 'Kỹ Năng Thuyết Trình & Phỏng Vấn' },
      { label: 'Tiếng Anh Thương Mại & Đàm Phán', value: 'Tiếng Anh Thương Mại & Đàm Phán' },
    ],
  },
  {
    blockType: 'select',
    name: 'time',
    label: 'Thời gian học mong muốn',
    defaultValue: '',
    width: 50,
    required: false,
    options: [
      { label: 'Tối 2-4-6 (19h30–21h00)', value: 'Tối 2-4-6 (19h30–21h00)' },
      { label: 'Tối 3-5-7 (19h30–21h00)', value: 'Tối 3-5-7 (19h30–21h00)' },
      { label: 'Cuối tuần Thứ 7 & CN', value: 'Cuối tuần Thứ 7 & CN' },
      { label: 'Linh hoạt theo lịch cá nhân', value: 'Linh hoạt theo lịch cá nhân' },
    ],
  },
  {
    blockType: 'textarea',
    name: 'message',
    label: 'Mục tiêu học tập của bạn',
    defaultValue: '',
    width: 100,
    required: false,
  },
  {
    blockType: 'checkbox',
    name: 'agreement',
    label: 'Tôi đồng ý để SpeakEdge liên hệ tư vấn theo Chính sách bảo mật.',
    width: 100,
    required: false,
  },
]

async function getOrCreateConsultationForm(payload: Payload): Promise<string | number> {
  const existingForms = await payload.find({
    collection: 'forms',
    where: { title: { equals: 'Đăng ký tư vấn miễn phí' } },
    limit: 1,
  })

  if (existingForms.docs.length > 0) {
    payload.logger.info(`Form tư vấn đã tồn tại (ID: ${existingForms.docs[0].id})`)
    return existingForms.docs[0].id
  }

  const confirmationMessage = lexicalDoc([
    heading('Đăng ký tư vấn thành công!', 'h3'),
    paragraph(
      'Cảm ơn bạn đã quan tâm. Chuyên viên học vụ của SpeakEdge sẽ liên hệ lại với bạn trong vòng 24 giờ làm việc.',
    ),
  ])

  const form = await payload.create({
    collection: 'forms',
    data: {
      title: 'Đăng ký tư vấn miễn phí',
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

  const heroImageId = await getOrCreateMedia(
    payload,
    'public/images/hero-home.jpg',
    'SpeakEdge Business English Training',
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
    title: 'Nhận lộ trình học riêng trong 24 giờ',
    description:
      'Để lại thông tin, chuyên viên học vụ sẽ gọi lại, kiểm tra trình độ nói miễn phí 15 phút và đề xuất khóa học phù hợp.',
    steps: [
      { text: 'Kiểm tra trình độ nói miễn phí với giảng viên' },
      { text: 'Nhận lộ trình & lịch lớp phù hợp giờ làm của bạn' },
      { text: 'Học thử 1 buổi trước khi quyết định đăng ký' },
    ],
    note: 'Trung tâm không thu học phí trực tuyến. Học phí được xác nhận và thanh toán tại quầy học vụ sau khi bạn chốt lớp.',
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
        title: 'SpeakEdge — Nền tảng Đào tạo Tiếng Anh Công Sở & Doanh Nghiệp',
        description:
          'Học tiếng Anh công sở thực chiến, nâng tầm kỹ năng giao tiếp, thuyết trình và đàm phán quốc tế.',
      },
    } as any,
  })

  payload.logger.info(`Đã tạo Trang chủ (ID: ${page.id})`)
  return page.id
}
