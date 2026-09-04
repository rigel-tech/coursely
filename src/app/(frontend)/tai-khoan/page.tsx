import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth'
import { verifyAccessToken } from '@/lib/auth/access-token'
import { ProfileForm } from './ProfileForm'
import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân | Coursely',
  description: 'Quản lý và cập nhật thông tin tài khoản học viên tại Coursely.',
}

export default async function ProfilePage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value
  const claims = verifyAccessToken(token)

  if (!claims || claims.status !== 'ACTIVE') {
    redirect('/?callbackUrl=%2Ftai-khoan')
  }

  const payload = await getPayload({ config: configPromise })

  let user: User | null = null
  try {
    user = (await payload.findByID({
      collection: 'users',
      id: claims.id,
      depth: 1,
      overrideAccess: true,
    })) as User
  } catch (err) {
    console.error('Failed to fetch student profile:', err)
    redirect('/')
  }

  if (!user) {
    redirect('/')
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hồ sơ học viên</h1>
          <p className="text-muted-foreground mt-2 text-base">
            Xem và cập nhật thông tin cá nhân của bạn để nhận thông báo khóa học và lịch học mới
            nhất.
          </p>
        </div>

        <ProfileForm user={user} />
      </div>
    </div>
  )
}
