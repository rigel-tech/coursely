import type { Payload } from 'payload'
import { heading, lexicalDoc, paragraph } from './lexical'

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
] as const

const CONSULTATION_BLOCK = (formId: string | number) => ({
  blockType: 'consultation' as const,
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
})

export async function seedConsultation(payload: Payload): Promise<string | number | null> {
  const existingForms = await payload.find({
    collection: 'forms',
    where: { title: { equals: 'Đăng ký tư vấn miễn phí' } },
    limit: 1,
  })

  let formId: string | number
  if (existingForms.docs.length > 0) {
    formId = existingForms.docs[0].id
    payload.logger.info(`Form tư vấn đã tồn tại (ID: ${formId})`)
  } else {
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
        fields: FORM_FIELDS as never,
        submitButtonLabel: 'Gửi yêu cầu tư vấn ngay',
        confirmationType: 'message',
        confirmationMessage: confirmationMessage as never,
      },
    })
    formId = form.id
    payload.logger.info(`Đã tạo Form tư vấn (ID: ${formId})`)
  }

  const homePages = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
  })
  if (homePages.docs.length === 0) return formId

  const homePage = homePages.docs[0]
  const layout = (homePage.layout || []) as unknown as Array<Record<string, unknown>>
  const block = CONSULTATION_BLOCK(formId)

  const hasBlock = layout.some((b) => b?.blockType === 'consultation')
  const updatedLayout = hasBlock
    ? layout.map((b) => (b?.blockType === 'consultation' ? block : b))
    : [
        ...layout.filter((b) => b?.blockType !== 'cta'),
        block,
        ...layout.filter((b) => b?.blockType === 'cta'),
      ]

  await payload.update({
    collection: 'pages',
    id: homePage.id,
    context: { disableRevalidate: true },
    draft: false,
    data: { _status: 'published', layout: updatedLayout as never },
  })
  payload.logger.info(`Consultation Block đã gắn vào Trang chủ (ID: ${homePage.id})`)
  return formId
}
