import type { Metadata } from 'next'
import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Đăng nhập | Coursely',
  description: 'Đăng nhập vào tài khoản học viên tại Coursely.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>
}) {
  const justVerified = (await searchParams).verified === '1'

  return (
    <main className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground text-center">
            Đăng nhập
          </CardTitle>
        </CardHeader>
        <CardContent>
          {justVerified && (
            <p
              className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
              role="status"
            >
              Email đã được xác minh. Vui lòng đăng nhập để tiếp tục.
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
