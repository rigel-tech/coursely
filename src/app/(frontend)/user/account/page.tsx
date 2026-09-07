import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { getSessionUser } from '@/lib/auth/session-user'
import { ProfileForm } from './ProfileForm'
import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân | Coursely',
  description: 'Quản lý và cập nhật thông tin tài khoản học viên tại Coursely.',
}

export default async function ProfilePage() {
  const claims = await getSessionUser()

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
    <div className="pb-24">
      <ProfileForm user={user} />
    </div>
  )
}
