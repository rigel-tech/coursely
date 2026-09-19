import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getSessionStudent } from '@/lib/auth/session-student'
import { StudentAccount } from '@/components/public/profile'
import { getStudentEnrollments } from '@/services/student-enrollment'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân | Coursely',
  description: 'Quản lý và cập nhật thông tin tài khoản học viên tại Coursely.',
}

export default async function ProfilePage() {
  const student = await getSessionStudent()

  // `status` is read from the document, not from the token: an account disabled
  // mid-session loses the page on its next navigation rather than at token expiry.
  //
  // Same destination `route-guard` uses — this page is the second gate on one door, and
  // two gates answering differently is how a visitor ends up somewhere with no way to
  // sign in. The path is the public one; the folder name never goes in a redirect.
  if (!student || student.status !== 'ACTIVE') {
    redirect('/dang-nhap?callbackUrl=%2Ftai-khoan')
  }

  const payload = await getPayload({ config: configPromise })
  const enrollments = await getStudentEnrollments(payload, student.id)

  return (
    <div className="pt-6 pb-12 sm:pt-16 sm:pb-24">
      <StudentAccount user={student} enrollments={enrollments} />
    </div>
  )
}
