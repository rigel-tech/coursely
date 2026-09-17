import type { Metadata } from 'next'
import React, { Suspense } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import { RegisterForm } from '@/components/public/forms/RegisterForm'

export const metadata: Metadata = {
  title: 'Đăng ký | Coursely',
  description: 'Tạo tài khoản học viên mới tại Coursely.',
}

export default function RegisterPage() {
  return (
    <main className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground text-center">
            Tạo tài khoản mới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
