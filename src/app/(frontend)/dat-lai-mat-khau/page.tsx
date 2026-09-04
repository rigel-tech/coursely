import type { Metadata } from 'next'
import React from 'react'

import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu | Coursely',
  description: 'Tạo mật khẩu mới cho tài khoản học viên tại Coursely.',
}

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams

  return (
    <main className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <ResetPasswordForm token={token} />
    </main>
  )
}
