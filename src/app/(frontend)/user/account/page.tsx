import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { getStudentSession } from '@/lib/auth/student-session'
import { ProfileForm } from './ProfileForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân | Coursely',
  description: 'Quản lý và cập nhật thông tin tài khoản học viên tại Coursely.',
}

export default async function ProfilePage() {
  const student = await getStudentSession()

  // `status` is read from the document, not from the token: an account disabled
  // mid-session loses the page on its next navigation rather than at token expiry.
  if (!student || student.status !== 'ACTIVE') {
    redirect('/?callbackUrl=%2Ftai-khoan')
  }

  return (
    <div className="pt-24 pb-24">
      <ProfileForm user={student} />
    </div>
  )
}
