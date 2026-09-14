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

function list(items: string[], listType: 'bullet' | 'number' = 'bullet') {
  return {
    type: 'list',
    listType,
    start: 1,
    tag: listType === 'bullet' ? 'ul' : 'ol',
    format: '',
    indent: 0,
    version: 1,
    children: items.map((item, idx) => ({
      type: 'listitem',
      value: idx + 1,
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          mode: 'normal',
          text: item,
          type: 'text',
          style: '',
          detail: 0,
          format: 0,
          version: 1,
        },
      ],
      direction: 'ltr',
    })),
    direction: 'ltr',
  }
}

export async function seedAbout(
  payload: Payload,
  options: { force?: boolean } = {},
): Promise<string | number | null> {
  try {
    payload.logger.info('📄 Kiểm tra trang "Giới thiệu" (slug: "gioi-thieu")...')

    const existingPages = await payload.find({
      collection: 'pages',
      where: {
        slug: {
          equals: 'gioi-thieu',
        },
      },
      limit: 1,
    })

    if (existingPages.docs.length > 0 && !options.force) {
      payload.logger.info(`✓ Trang "Giới thiệu" đã tồn tại (ID: ${existingPages.docs[0].id})`)
      return existingPages.docs[0].id
    }

    // 1. Hero Content
    const heroRichText = createLexicalDoc([
      heading('Kiến tạo tương lai với kỹ năng thực chiến cùng Coursely', 'h1'),
      paragraph(
        'Coursely là nền tảng đào tạo trực tuyến hàng đầu, kết nối học viên với các chuyên gia đầu ngành thông qua lộ trình học tinh gọn và các dự án thực tế.',
      ),
    ])

    // 2. Block Content - Column 1: Sứ mệnh & Câu chuyện
    const column1RichText = createLexicalDoc([
      heading('Câu chuyện của Coursely', 'h3'),
      paragraph(
        'Được thành lập với mục tiêu thu hẹp khoảng cách giữa lý thuyết học thuật và yêu cầu tuyển dụng thực tế, Coursely mang đến môi trường học tập linh hoạt, hiện đại và chuẩn quốc tế.',
      ),
      heading('Sứ mệnh của chúng tôi:', 'h4'),
      list([
        'Cung cấp các chương trình đào tạo bám sát thực tế doanh nghiệp.',
        'Giúp học viên nắm vững kỹ năng cốt lõi và xây dựng Portfolio ấn tượng.',
        'Đồng hành và hỗ trợ giải đáp 1:1 trong suốt quá trình học tập.',
      ]),
    ])

    // 3. Block Content - Column 2: Tầm nhìn & Giá trị cốt lõi
    const column2RichText = createLexicalDoc([
      heading('Tầm nhìn & Giá trị cốt lõi', 'h3'),
      paragraph(
        'Chúng tôi hướng tới trở thành hệ sinh thái học tập số hàng đầu khu vực, nơi bất kỳ ai cũng có thể nâng tầm sự nghiệp một cách bền vững.',
      ),
      heading('4 Giá trị cốt lõi:', 'h4'),
      list(
        [
          'Thực chiến đi đầu: Học từ dự án thật, làm được việc ngay.',
          'Giảng viên chuyên gia: Đội ngũ Mentor từ các tập đoàn lớn.',
          'Học tập linh hoạt: Tự do học mọi lúc, mọi nơi trên mọi thiết bị.',
          'Cam kết chất lượng: Hỗ trợ trọn đời và kết nối cơ hội nghề nghiệp.',
        ],
        'number',
      ),
    ])

    // 4. Block CTA (Call To Action)
    const ctaRichText = createLexicalDoc([
      heading('Sẵn sàng bứt phá sự nghiệp cùng Coursely?', 'h3'),
      paragraph(
        'Khám phá ngay hàng trăm khóa học chất lượng cao và bắt đầu hành trình nâng cao kỹ năng của bạn hôm nay.',
      ),
    ])

    const existingMedia = await payload.find({
      collection: 'media',
      limit: 1,
    })

    const mediaId = existingMedia.docs[0]?.id

    const aboutPageData = {
      title: 'Giới thiệu',
      slug: 'gioi-thieu',
      _status: 'published' as const,
      hero: mediaId
        ? {
            type: 'mediumImpact' as const,
            richText: heroRichText as never,
            media: mediaId,
            links: [],
          }
        : {
            type: 'lowImpact' as const,
            richText: heroRichText as never,
            links: [],
          },
      layout: [
        {
          blockType: 'content' as const,
          background: 'none' as const,
          columns: [
            {
              size: 'half' as const,
              cardStyle: 'none' as const,
              textColor: 'default' as const,
              richText: column1RichText as never,
            },
            {
              size: 'half' as const,
              cardStyle: 'none' as const,
              textColor: 'default' as const,
              richText: column2RichText as never,
            },
          ],
        },
        {
          blockType: 'cta' as const,
          richText: ctaRichText as never,
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
        title: 'Giới thiệu về Coursely - Nền tảng học tập & phát triển kỹ năng thực chiến',
        description:
          'Tìm hiểu về sứ mệnh, tầm nhìn và đội ngũ giảng viên tại Coursely. Chúng tôi cam kết mang lại lộ trình học tập chất lượng cao và bám sát thực tế tuyển dụng.',
      },
    }

    let aboutPageId: string | number

    if (existingPages.docs.length > 0) {
      const existingPage = existingPages.docs[0]
      aboutPageId = existingPage.id
      await payload.update({
        collection: 'pages',
        id: existingPage.id,
        context: { disableRevalidate: true },
        data: aboutPageData as never,
      })
      payload.logger.info(`✓ Đã cập nhật thành công trang "Giới thiệu" (ID: ${aboutPageId})`)
    } else {
      const newPage = await payload.create({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: aboutPageData as never,
      })
      aboutPageId = newPage.id
      payload.logger.info(`✓ Đã tạo mới thành công trang "Giới thiệu" (ID: ${aboutPageId})`)
    }

    // Tự động thêm vào Menu điều hướng (Header)
    try {
      const header = await payload.findGlobal({
        slug: 'header',
        depth: 0,
      })

      const navItems = (header?.navItems || []) as Array<{
        link: {
          type?: 'reference' | 'custom'
          reference?: { relationTo: 'pages'; value: number | string | Record<string, unknown> }
          url?: string
          label: string
        }
      }>

      const alreadyHasAbout = navItems.some((item) => {
        const refVal = item.link?.reference?.value
        const refId =
          typeof refVal === 'object' && refVal !== null
            ? (refVal as { id?: string | number }).id
            : refVal
        return (
          item.link?.label?.toLowerCase().includes('giới thiệu') ||
          item.link?.url === '/gioi-thieu' ||
          (refId && String(refId) === String(aboutPageId))
        )
      })

      if (!alreadyHasAbout) {
        const updatedNavItems = [
          ...navItems,
          {
            link: {
              type: 'reference' as const,
              reference: {
                relationTo: 'pages' as const,
                value:
                  typeof aboutPageId === 'string'
                    ? Number(aboutPageId) || aboutPageId
                    : aboutPageId,
              },
              label: 'Giới thiệu',
            },
          },
        ]

        await payload.updateGlobal({
          slug: 'header',
          context: { disableRevalidate: true },
          data: {
            navItems: updatedNavItems as never,
          },
        })
        payload.logger.info('✓ Đã tự động thêm menu "Giới thiệu" vào Header!')
      } else {
        payload.logger.info('✓ Menu "Giới thiệu" đã có sẵn trong Header.')
      }
    } catch (headerErr) {
      payload.logger.warn(`⚠️ Không thể cập nhật Header: ${headerErr}`)
    }

    return aboutPageId
  } catch (error) {
    payload.logger.error(`❌ Lỗi khi seed trang Giới thiệu: ${error}`)
    return null
  }
}
