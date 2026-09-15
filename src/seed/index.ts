import type { Payload } from 'payload'
import { seedSiteSettings } from './seedSiteSettings'
import { seedHome } from './seedHome'
import { seedAbout } from './seedAbout'
import { seedHeader } from './seedHeader'
import { seedCourses } from './seedCourses'

export { seedSiteSettings, seedHome, seedAbout, seedHeader, seedCourses }

export async function autoSeed(payload: Payload): Promise<void> {
  try {
    payload.logger.info('Bắt đầu Auto-Seed...')

    const [, homePageId, aboutPageId] = await Promise.all([
      seedSiteSettings(payload),
      seedHome(payload),
      seedAbout(payload),
      seedCourses(payload),
    ])

    await seedHeader(payload, { homePageId, aboutPageId })

    payload.logger.info('Auto-Seed hoàn tất!')
  } catch (error) {
    payload.logger.error(`Auto-Seed lỗi: ${error}`)
  }
}
