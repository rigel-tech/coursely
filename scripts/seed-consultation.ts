// Seeds the Consultation Form and attaches the Consultation Block to the Home Page.
// Usage: payload run scripts/seed-consultation.ts

import { getPayload } from 'payload'
import config from '../src/payload.config.js'

try {
  console.log('🚀 Đang khởi tạo kết nối Payload CMS...')
  const payload = await getPayload({ config })

  console.log('📋 Kiểm tra biểu mẫu tư vấn...')
  const existingForms = await payload.find({
    collection: 'forms',
    where: {
      title: {
        equals: 'Đăng ký tư vấn miễn phí',
      },
    },
    limit: 1,
  })

  let formId: string | number

  const confirmationRichText = {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'heading',
          tag: 'h3',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              mode: 'normal',
              text: 'Đăng ký tư vấn thành công!',
              type: 'text',
              style: '',
              detail: 0,
              format: 1,
              version: 1,
            },
          ],
          direction: 'ltr',
        },
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              mode: 'normal',
              text: 'Cảm ơn bạn đã quan tâm. Chuyên viên học vụ của Coursely sẽ liên hệ lại với bạn trong vòng 24 giờ làm việc để tư vấn lộ trình và xếp lịch học thử.',
              type: 'text',
              style: '',
              detail: 0,
              format: 0,
              version: 1,
            },
          ],
          direction: 'ltr',
        },
      ],
      direction: 'ltr',
    },
  }

  const formFields = [
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
      defaultValue: '09xx xxx xxx',
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
        { label: 'Tiếng Anh Giao Tiếp Doanh Nghiệp', value: 'business-english' },
        { label: 'Luyện thi IELTS Cấp Tốc', value: 'ielts' },
        { label: 'Tiếng Anh Cho Người Đi Làm', value: 'working-english' },
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
        { label: 'Tối 2-4-6 (19h30 - 21h00)', value: 't246' },
        { label: 'Tối 3-5-7 (19h30 - 21h00)', value: 't357' },
        { label: 'Cuối tuần Thứ 7 & CN', value: 'weekend' },
        { label: 'Linh hoạt theo lịch cá nhân', value: 'flexible' },
      ],
    },
    {
      blockType: 'textarea',
      name: 'message',
      label: 'Mục tiêu của bạn',
      defaultValue: 'Ví dụ: cần tự tin họp với đối tác nước ngoài trong 3 tháng tới',
      width: 100,
      required: false,
      rows: 3,
    },
    {
      blockType: 'checkbox',
      name: 'agreement',
      label:
        'Tôi đồng ý để Coursely liên hệ tư vấn và xử lý thông tin của tôi theo Chính sách bảo mật.',
      width: 100,
      required: false,
    },
  ]

  if (existingForms.docs.length > 0) {
    formId = existingForms.docs[0].id
    console.log(`✓ Form 'Đăng ký tư vấn miễn phí' đã tồn tại (ID: ${formId})`)
  } else {
    const newForm = await payload.create({
      collection: 'forms',
      data: {
        title: 'Đăng ký tư vấn miễn phí',
        submitButtonLabel: 'Gửi thông tin đăng ký',
        confirmationType: 'message',
        confirmationMessage: confirmationRichText as any,
        fields: formFields as any,
      },
    })
    formId = newForm.id
    console.log(`✓ Đã tạo thành công Form 'Đăng ký tư vấn miễn phí' (ID: ${formId})`)
  }

  console.log('📄 Kiểm tra trang chủ (slug: "/")...')
  const pages = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: '/',
      },
    },
    limit: 1,
  })

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

  if (pages.docs.length > 0) {
    const homePage = pages.docs[0]
    const currentLayout = Array.isArray(homePage.layout) ? [...homePage.layout] : []

    const hasConsultationBlock = currentLayout.some((b) => b.blockType === 'consultation')

    if (!hasConsultationBlock) {
      currentLayout.push(consultationBlock as any)
      await payload.update({
        collection: 'pages',
        id: homePage.id,
        context: { disableRevalidate: true },
        data: {
          layout: currentLayout as any,
        },
      })
      console.log(`✓ Đã thêm Consultation Block vào Trang Chủ (ID: ${homePage.id})`)
    } else {
      // Cập nhật lại form_id cho consultation block nếu chưa gán
      const updatedLayout = currentLayout.map((block) => {
        if (block.blockType === 'consultation') {
          return {
            ...block,
            ...consultationBlock,
            form: formId,
          }
        }
        return block
      })
      await payload.update({
        collection: 'pages',
        id: homePage.id,
        context: { disableRevalidate: true },
        data: {
          layout: updatedLayout as any,
        },
      })
      console.log(`✓ Đã cập nhật Consultation Block trên Trang Chủ với Form ID: ${formId}`)
    }
  } else {
    const newPage = await payload.create({
      collection: 'pages',
      context: { disableRevalidate: true },
      data: {
        title: 'Trang chủ',
        slug: '/',
        _status: 'published',
        hero: {
          type: 'none',
        },
        layout: [consultationBlock as any],
      },
    })
    console.log(`✓ Đã tạo Trang Chủ mới kèm Consultation Block (ID: ${newPage.id})`)
  }

  console.log('🎉 Hoàn tất seed dữ liệu tư vấn!')
} catch (error) {
  console.error('❌ Lỗi khi seed dữ liệu:', error)
  process.exit(1)
}

process.exit(0)
