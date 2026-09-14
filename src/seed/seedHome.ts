import type { Payload } from 'payload'

function createLexicalDoc(children: unknown[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
      direction: 'ltr',
    },
  }
}

function heading(text: string, tag: 'h1' | 'h2' | 'h3' | 'h4' = 'h2') {
  return {
    type: 'heading',
    tag,
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        mode: 'normal',
        text,
        type: 'text',
        style: '',
        detail: 0,
        format: 1,
        version: 1,
      },
    ],
    direction: 'ltr',
  }
}

function paragraph(text: string) {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        mode: 'normal',
        text,
        type: 'text',
        style: '',
        detail: 0,
        format: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
  }
}

export async function seedHome(
  payload: Payload,
  options: { force?: boolean; formId?: string | number | null } = {},
): Promise<string | number | null> {
  try {
    payload.logger.info('🏠 Kiểm tra trang "Trang chủ" (slug: "home")...')

    const existingPages = await payload.find({
      collection: 'pages',
      draft: true,
      where: {
        slug: {
          in: ['home', 'index', 'trang-chu'],
        },
      },
      limit: 1,
    })

    const heroRichText = createLexicalDoc([
      heading('Nâng tầm sự nghiệp cùng SpeakEdge - Anh ngữ công sở chuẩn thực chiến', 'h1'),
      paragraph(
        'Đột phá kỹ năng giao tiếp tiếng Anh trong môi trường làm việc quốc tế. Học cùng chuyên gia với lộ trình tinh gọn, ứng dụng ngay vào công việc thực tế.',
      ),
    ])

    const ctaRichText = createLexicalDoc([
      heading('Sẵn sàng bứt phá sự nghiệp ngay hôm nay?', 'h3'),
      paragraph(
        'Khám phá ngay các khóa học được thiết kế chuyên biệt cho người đi làm và doanh nghiệp.',
      ),
    ])

    const existingMedia = await payload.find({
      collection: 'media',
      limit: 1,
    })
    const mediaId = existingMedia.docs[0]?.id

    // Lấy form ID nếu không truyền vào
    let formId = options.formId
    if (!formId) {
      const existingForms = await payload.find({
        collection: 'forms',
        where: {
          title: {
            equals: 'Đăng ký tư vấn miễn phí',
          },
        },
        limit: 1,
      })
      formId = existingForms.docs[0]?.id
    }

    const layoutBlocks: unknown[] = []

    if (formId) {
      layoutBlocks.push({
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
      })
    }

    layoutBlocks.push({
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
    })

    const homePageData = {
      title: 'Trang chủ',
      slug: 'home',
      _status: 'published' as const,
      hero: mediaId
        ? {
            type: 'mediumImpact' as const,
            richText: heroRichText as never,
            media: mediaId,
            links: [
              {
                link: {
                  type: 'custom' as const,
                  url: '/khoa-hoc',
                  label: 'Xem các khóa học',
                  appearance: 'default' as const,
                },
              },
            ],
          }
        : {
            type: 'lowImpact' as const,
            richText: heroRichText as never,
            links: [
              {
                link: {
                  type: 'custom' as const,
                  url: '/khoa-hoc',
                  label: 'Xem các khóa học',
                  appearance: 'default' as const,
                },
              },
            ],
          },
      layout: layoutBlocks as never,
      meta: {
        title: 'SpeakEdge - Nền tảng Đào tạo Tiếng Anh Công Sở & Doanh Nghiệp',
        description:
          'Học tiếng Anh công sở thực chiến, nâng tầm kỹ năng giao tiếp, thuyết trình và đàm phán quốc tế.',
      },
    }

    if (existingPages.docs.length > 0) {
      const existingPage = existingPages.docs[0]
      await payload.update({
        collection: 'pages',
        id: existingPage.id,
        context: { disableRevalidate: true },
        data: homePageData as never,
        draft: false,
      })
      payload.logger.info(
        `✓ Đã cập nhật và Publish thành công "Trang chủ" (ID: ${existingPage.id})`,
      )
      return existingPage.id
    }

    const newPage = await payload.create({
      collection: 'pages',
      context: { disableRevalidate: true },
      data: homePageData as never,
      draft: false,
    })
    payload.logger.info(`✓ Đã tạo mới và Publish thành công "Trang chủ" (ID: ${newPage.id})`)
    return newPage.id
  } catch (error) {
    payload.logger.error(`❌ Lỗi khi seed Trang chủ: ${error}`)
    return null
  }
}
