import type { Metadata } from 'next'
import React from 'react'

import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Quên mật khẩu | Coursely',
  description: 'Yêu cầu liên kết đặt lại mật khẩu tài khoản học viên tại Coursely.',
}

export default function ForgotPasswordPage() {
  return (
    <main className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <ForgotPasswordForm />
    </main>
  )
}
