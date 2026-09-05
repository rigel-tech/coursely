import type { Metadata } from 'next'
import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Đăng nhập | Coursely',
  description: 'Đăng nhập vào tài khoản học viên tại Coursely.',
}

export default function LoginPage() {
  return (
    <main className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground text-center">
            Đăng nhập
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
