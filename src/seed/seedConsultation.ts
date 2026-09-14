import type { Payload } from 'payload'

export async function seedConsultation(
  payload: Payload,
  options: { force?: boolean } = {},
): Promise<string | number | null> {
  try {
    payload.logger.info('📋 Kiểm tra dữ liệu Form tư vấn...')

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
      payload.logger.info(`✓ Form tư vấn đã tồn tại (ID: ${formId})`)
    } else {
      const newForm = await payload.create({
        collection: 'forms',
        data: {
          title: 'Đăng ký tư vấn miễn phí',
          fields: formFields as never,
          submitButtonLabel: 'Gửi yêu cầu tư vấn ngay',
          confirmationType: 'message',
          confirmationMessage: confirmationRichText as never,
        },
      })
      formId = newForm.id
      payload.logger.info(`✓ Đã tạo thành công Form tư vấn (ID: ${formId})`)
    }

    // Gắn block tư vấn vào Trang chủ
    const homePages = await payload.find({
      collection: 'pages',
      draft: true,
      where: {
        slug: {
          in: ['home', 'index', 'trang-chu'],
        },
      },
      limit: 1,
    })

    const consultationBlockData = {
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
    }

    if (homePages.docs.length > 0) {
      const homePage = homePages.docs[0]
      const layout = (homePage.layout || []) as unknown as Array<Record<string, unknown>>

      const hasConsultationBlock = layout.some(
        (block) =>
          block && (block.blockType === 'consultation' || block.blockType === 'consultationBlock'),
      )

      let updatedLayout: Array<Record<string, unknown>>
      if (hasConsultationBlock) {
        updatedLayout = layout.map((block) =>
          block && (block.blockType === 'consultation' || block.blockType === 'consultationBlock')
            ? consultationBlockData
            : block,
        )
      } else {
        // Lọc bỏ block content rỗng nếu có
        const cleanLayout = layout.filter(
          (b) =>
            b && !(b.blockType === 'content' && Array.isArray(b.columns) && b.columns.length === 0),
        )
        updatedLayout = [...cleanLayout, consultationBlockData]
      }

      await payload.update({
        collection: 'pages',
        id: homePage.id,
        context: { disableRevalidate: true },
        data: {
          _status: 'published',
          layout: updatedLayout as never,
        },
        draft: false,
      })
      payload.logger.info(
        `✓ Đã cập nhật và Publish Consultation Block vào Trang chủ (ID: ${homePage.id})`,
      )
    }

    return formId
  } catch (error) {
    payload.logger.error(`❌ Lỗi khi seed form tư vấn: ${error}`)
    return null
  }
}
