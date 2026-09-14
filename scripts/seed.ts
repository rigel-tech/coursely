import { getPayload } from 'payload'
import config from '../src/payload.config.js'
import { autoSeed } from '../src/seed/index.js'

try {
  console.log('Bắt đầu chạy tiến trình Seed dữ liệu...')
  const payload = await getPayload({ config })
  await autoSeed(payload)
  console.log('Seed toàn bộ dữ liệu thành công!')
} catch (error) {
  console.error('Lỗi khi thực hiện Seed:', error)
  process.exit(1)
}

process.exit(0)
