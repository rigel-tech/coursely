import type { Payload } from 'payload'
import { seedCourses } from './seedCourses'
import { seedConsultation } from './seedConsultation'
import { seedHome } from './seedHome'
import { seedAbout } from './seedAbout'

export { seedCourses } from './seedCourses'
export { seedConsultation } from './seedConsultation'
export { seedHome } from './seedHome'
export { seedAbout } from './seedAbout'

export async function autoSeed(payload: Payload, options: { force?: boolean } = {}): Promise<void> {
  try {
    payload.logger.info('🌱 Bắt đầu tiến trình kiểm tra & khởi tạo dữ liệu mặc định (Seed)...')

    // 1. Seed khóa học mẫu
    await seedCourses(payload, options)

    // 2. Seed form tư vấn
    const formId = await seedConsultation(payload, options)

    // 3. Seed & Publish Trang chủ (slug: 'home')
    await seedHome(payload, { ...options, formId })

    // 4. Seed & Publish Trang Giới thiệu (slug: 'gioi-thieu')
    await seedAbout(payload, options)

    payload.logger.info('🎉 Hoàn tất tiến trình Seed dữ liệu!')
  } catch (error) {
    payload.logger.error(`❌ Lỗi trong quá trình Auto-Seed: ${error}`)
  }
}
