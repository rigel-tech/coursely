import type { Payload } from 'payload'
import { getOrCreateMedia } from './lexical'

const CATEGORIES = [
  { title: 'Tiếng Anh Giao Tiếp', slug: 'tieng-anh-giao-tiep' },
  { title: 'Luyện Thi Chứng Chỉ', slug: 'luyen-thi-chung-chi' },
  { title: 'Tiếng Anh Chuyên Ngành', slug: 'tieng-anh-chuyen-nganh' },
]

const COURSES = [
  {
    title: 'Tiếng Anh Giao Tiếp Doanh Nghiệp (Business English)',
    slug: 'tieng-anh-giao-tiep-doanh-nghiep',
    shortDescription:
      'Lộ trình thực chiến giúp bạn tự tin họp hành, viết email chuyên nghiệp và đàm phán với đối tác quốc tế.',
    duration: '8 tuần (24 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'tieng-anh-giao-tiep',
    imagePath: 'public/images/course-business-english.jpg',
    tags: [{ tag: 'Giao tiếp' }, { tag: 'Doanh nghiệp' }, { tag: 'Thực chiến' }],
  },
  {
    title: 'Luyện Thi IELTS Cấp Tốc Cho Người Đi Làm',
    slug: 'luyen-thi-ielts-cap-toc',
    shortDescription:
      'Phương pháp học tập trọng tâm, tối ưu hóa thời gian với mục tiêu nâng từ 1.0–1.5 band score trong 3 tháng.',
    duration: '12 tuần (36 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'luyen-thi-chung-chi',
    imagePath: 'public/images/course-ielts.jpg',
    tags: [{ tag: 'IELTS' }, { tag: 'Cấp tốc' }, { tag: 'Band 6.5+' }],
  },
  {
    title: 'Kỹ Năng Thuyết Trình & Phỏng Vấn Tiếng Anh',
    slug: 'ky-nang-thuyet-trinh-phong-van',
    shortDescription:
      'Trang bị kỹ năng trả lời phỏng vấn xuất sắc vào các tập đoàn đa quốc gia và làm chủ sân khấu thuyết trình.',
    duration: '6 tuần (18 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'tieng-anh-chuyen-nganh',
    imagePath: 'public/images/course-presentation.jpg',
    tags: [{ tag: 'Thuyết trình' }, { tag: 'Phỏng vấn' }, { tag: 'Soft skills' }],
  },
  {
    title: 'Tiếng Anh Thương Mại & Đàm Phán Hợp Đồng',
    slug: 'tieng-anh-thuong-mai-dam-phan',
    shortDescription:
      'Nắm vững thuật ngữ tài chính–thương mại quốc tế, kỹ thuật thương lượng và soạn thảo hợp đồng chuẩn mực.',
    duration: '10 tuần (30 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'tieng-anh-chuyen-nganh',
    imagePath: 'public/images/course-negotiation.jpg',
    tags: [{ tag: 'Thương mại' }, { tag: 'Đàm phán' }, { tag: 'Hợp đồng' }],
  },
  {
    title: 'Luyện Thi TOEIC 750+ Tinh Gọn Cho Người Bận Rộn',
    slug: 'luyện-thi-toeic-750-tinh-gon',
    shortDescription:
      'Chiến thuật làm bài độc quyền, luyện đề chuyên sâu giúp đạt mục tiêu 750+ TOEIC nhanh chóng.',
    duration: '8 tuần (24 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'luyen-thi-chung-chi',
    imagePath: 'public/images/course-toeic.jpg',
    tags: [{ tag: 'TOEIC' }, { tag: '750+' }, { tag: 'Cấp tốc' }],
  },
  {
    title: 'Tiếng Anh Phản Xạ & Viết Email Chuẩn Quốc Tế',
    slug: 'tieng-anh-phan-xa-viet-email',
    shortDescription:
      'Xóa bỏ thói quen dịch nhẩm, làm chủ kỹ thuật phản xạ tự nhiên và soạn thảo email công việc chuyên nghiệp.',
    duration: '6 tuần (18 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'tieng-anh-giao-tiep',
    imagePath: 'public/images/course-email-reflex.jpg',
    tags: [{ tag: 'Phản xạ' }, { tag: 'Email' }, { tag: 'Giao tiếp' }],
  },
]

export async function seedCourses(payload: Payload) {
  const existingCourses = await payload.find({ collection: 'courses', limit: 1 })
  if (existingCourses.totalDocs >= 6) {
    return payload.logger.info(`Đã có ${existingCourses.totalDocs} khóa học.`)
  }

  const catIds: Record<string, string | number> = {}
  await Promise.all(
    CATEGORIES.map(async (cat) => {
      const found = await payload.find({
        collection: 'categories',
        where: { slug: { equals: cat.slug } },
        limit: 1,
      })
      if (found.docs.length > 0) {
        catIds[cat.slug] = found.docs[0].id
      } else {
        const created = await payload.create({ collection: 'categories', data: { ...cat } })
        catIds[cat.slug] = created.id
        payload.logger.info(`Danh mục: ${cat.title}`)
      }
    }),
  )

  await Promise.all(
    COURSES.map(async ({ catSlug, imagePath, ...rest }) => {
      const existing = await payload.find({
        collection: 'courses',
        where: { slug: { equals: rest.slug } },
        limit: 1,
      })

      const imageId = await getOrCreateMedia(payload, imagePath, rest.title)

      if (existing.docs.length > 0) {
        if (!existing.docs[0].image && imageId) {
          await payload.update({
            collection: 'courses',
            id: existing.docs[0].id,
            data: { image: imageId },
          })
        }
        return
      }

      await payload.create({
        collection: 'courses',
        draft: false,
        data: {
          ...rest,
          category: catIds[catSlug],
          image: imageId,
          _status: 'published',
        } as any,
      })
      payload.logger.info(`Khóa học: ${rest.title}`)
    }),
  )
}
