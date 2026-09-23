import type { Payload } from 'payload'
import { getOrCreateMedia } from './lexical'

const CATEGORIES = [
  { title: 'Chuyển Đổi Số & Chiến Lược', slug: 'chuyen-doi-so-chien-luoc' },
  { title: 'Trí Tuệ Nhân Tạo (AI) & Tự Động Hóa', slug: 'ai-tu-dong-hoa' },
  { title: 'Phân Tích Dữ Liệu & Ra Quyết Định', slug: 'phan-tich-du-lieu' },
]

const COURSES = [
  {
    title: 'Chuyển Đổi Số Toàn Diện Cho Doanh Nghiệp (Digital Transformation Strategy)',
    slug: 'chuyen-doi-so-toan-dien-doanh-nghiep',
    shortDescription:
      'Lộ trình xây dựng chiến lược chuyển đổi số, tối ưu hóa quy trình vận hành và xây dựng văn hóa số thích ứng nhanh trong doanh nghiệp.',
    duration: '8 tuần (24 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'chuyen-doi-so-chien-luoc',
    imagePath: 'public/images/course-digital-transformation.jpg',
    tags: [{ tag: 'Chiến lược số' }, { tag: 'Chuyển đổi số' }, { tag: 'Doanh nghiệp' }],
  },
  {
    title: 'Ứng Dụng GenAI & ChatGPT Tối Ưu Hiệu Suất Làm Việc',
    slug: 'ung-dung-genai-chatgpt-hieu-suat',
    shortDescription:
      'Làm chủ các công cụ AI thế hệ mới (ChatGPT, Claude, Midjourney) để tự động hóa soạn thảo, phân tích tài liệu và bứt phá năng suất cá nhân & đội ngũ.',
    duration: '6 tuần (18 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'ai-tu-dong-hoa',
    imagePath: 'public/images/course-genai.jpg',
    tags: [{ tag: 'GenAI' }, { tag: 'ChatGPT' }, { tag: 'Năng suất' }],
  },
  {
    title: 'Tự Động Hóa Quy Trình Nghiệp Vụ Với No-Code / Zapier / Make',
    slug: 'tu-dong-hoa-quy-trinh-no-code',
    shortDescription:
      'Thiết kế và triển khai các luồng tự động hóa tích hợp CRM, ERP, Marketing và Email mà không cần viết mã lập trình phức tạp.',
    duration: '8 tuần (24 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'ai-tu-dong-hoa',
    imagePath: 'public/images/course-automation.jpg',
    tags: [{ tag: 'Tự động hóa' }, { tag: 'No-Code' }, { tag: 'Zapier' }],
  },
  {
    title: 'Phân Tích Dữ Liệu Kinh Doanh Thực Chiến Với Power BI & SQL',
    slug: 'phan-tich-du-lieu-power-bi-sql',
    shortDescription:
      'Khai phá sức mạnh dữ liệu kinh doanh, xây dựng Dashboard quản trị trực quan và đưa ra quyết định chiến lược dựa trên dữ liệu (Data-driven).',
    duration: '10 tuần (30 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'phan-tich-du-lieu',
    imagePath: 'public/images/course-data-analytics.jpg',
    tags: [{ tag: 'Power BI' }, { tag: 'SQL' }, { tag: 'Data Analytics' }],
  },
  {
    title: 'Quản Trị Dự Án Số & Tư Duy Agile/Scrum Cho Nhà Quản Lý',
    slug: 'quan-tri-du-an-so-agile-scrum',
    shortDescription:
      'Nắm vững phương pháp quản trị dự án công nghệ hiện đại, nâng cao tính linh hoạt của đội ngũ và tăng tốc độ đưa sản phẩm/dịch vụ ra thị trường.',
    duration: '6 tuần (18 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'chuyen-doi-so-chien-luoc',
    imagePath: 'public/images/course-agile.jpg',
    tags: [{ tag: 'Agile' }, { tag: 'Scrum' }, { tag: 'Quản trị dự án' }],
  },
  {
    title: 'Bảo Mật Thông Tin & Quản Trị Rủi Ro Dữ Liệu Doanh Nghiệp',
    slug: 'bao-mat-thong-tin-quan-tri-rui-ro',
    shortDescription:
      'Nhận diện lỗ hổng an ninh thông tin, phòng chống tấn công mạng và thiết lập quy trình bảo vệ dữ liệu chuẩn an toàn quốc tế.',
    duration: '6 tuần (18 buổi)',
    courseType: 'OFFLINE',
    catSlug: 'phan-tich-du-lieu',
    imagePath: 'public/images/course-cybersecurity.jpg',
    tags: [{ tag: 'Bảo mật' }, { tag: 'An ninh mạng' }, { tag: 'Quản trị rủi ro' }],
  },
]

export async function seedCourses(payload: Payload) {
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
            context: { disableRevalidate: true },
            id: existing.docs[0].id,
            data: { image: imageId },
          })
        }
        return
      }

      await payload.create({
        collection: 'courses',
        context: { disableRevalidate: true },
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
