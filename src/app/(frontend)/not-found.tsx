import type { Metadata } from 'next'
import React from 'react'

import { NotFoundView } from '@/components/public/NotFoundView'

export const metadata: Metadata = {
  title: '404 - Không tìm thấy trang | Coursely',
  description: 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển trên Coursely.',
}

export default function NotFound() {
  return <NotFoundView />
}
