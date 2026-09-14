import type { Payload } from 'payload'

export async function seedCourses(
  payload: Payload,
  options: { force?: boolean } = {},
): Promise<void> {
  try {
    payload.logger.info('📚 Kiểm tra danh sách khóa học...')

    const existingCourses = await payload.find({
      collection: 'courses',
      limit: 1,
    })

    if (existingCourses.totalDocs > 0 && !options.force) {
      payload.logger.info(`✓ Đã có ${existingCourses.totalDocs} khóa học trong hệ thống.`)
      return
    }

    const sampleCourses = [
      {
        title: 'Tiếng Anh Giao Tiếp Doanh Nghiệp (Business English)',
        slug: 'tieng-anh-giao-tiep-doanh-nghiep',
        shortDescription:
          'Lộ trình thực chiến giúp bạn tự tin thuyết trình, viết email chuyên nghiệp và đàm phán với đối tác quốc tế.',
        duration: '8 tuần (24 buổi)',
        courseType: 'OFFLINE' as const,
        _status: 'published' as const,
      },
      {
        title: 'Luyện Thi IELTS Cấp Tốc Cho Người Đi Làm',
        slug: 'luyen-thi-ielts-cap-toc',
        shortDescription:
          'Phương pháp học tập trọng tâm, tối ưu hóa thời gian với mục tiêu nâng từ 1.0 - 1.5 band score trong thời gian ngắn nhất.',
        duration: '12 tuần (36 buổi)',
        courseType: 'OFFLINE' as const,
        _status: 'published' as const,
      },
      {
        title: 'Kỹ Năng Thuyết Trình & Phỏng Vấn Tiếng Anh',
        slug: 'ky-nang-thuyet-trinh-phong-van',
        shortDescription:
          'Trang bị kỹ năng trả lời phỏng vấn xuất sắc vào các tập đoàn đa quốc gia và làm chủ sân khấu thuyết trình dự án.',
        duration: '6 tuần (18 buổi)',
        courseType: 'OFFLINE' as const,
        _status: 'published' as const,
      },
    ]

    for (const course of sampleCourses) {
      const existing = await payload.find({
        collection: 'courses',
        where: {
          slug: { equals: course.slug },
        },
        limit: 1,
      })

      if (existing.docs.length === 0) {
        await payload.create({
          collection: 'courses',
          data: course as never,
          draft: false,
        })
        payload.logger.info(`✓ Đã tạo khóa học: ${course.title}`)
      }
    }
  } catch (error) {
    payload.logger.error(`❌ Lỗi khi seed khóa học: ${error}`)
  }
}
