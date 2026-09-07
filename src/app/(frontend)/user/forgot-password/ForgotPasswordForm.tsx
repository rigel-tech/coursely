'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react'
import * as React from 'react'
import { useActionState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/public/ui/alert'
import { Button } from '@/components/public/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/public/ui/card'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { forgotPasswordAction, type ForgotPasswordFormState } from '@/actions/auth/forgot-password'

const initialState: ForgotPasswordFormState = {
  status: 'idle',
}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState)

  if (state.status === 'success') {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/20 text-success-foreground">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Kiểm tra hộp thư của bạn
          </CardTitle>
          <CardDescription className="text-sm mt-2 text-muted-foreground">
            {state.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Nếu bạn không nhận được email trong vài phút, vui lòng kiểm tra mục Thư rác (Spam) hoặc
            thử gửi lại.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/" className="flex items-center justify-center gap-2">
              <ArrowLeft className="size-4" />
              <span>Quay lại trang chủ</span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">Quên mật khẩu?</CardTitle>
        <CardDescription className="text-sm mt-1">
          Nhập email đăng ký của bạn. Chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu mới.
        </CardDescription>
      </CardHeader>
      <form action={formAction} noValidate>
        <CardContent className="space-y-4">
          {state.status === 'error' && state.message && !state.fieldErrors?.email && (
            <Alert variant="destructive">
              <AlertCircle className="size-4 shrink-0" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-foreground font-medium flex items-center gap-1.5"
            >
              <Mail className="size-4 text-muted-foreground" />
              Email đăng ký
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ten@example.com"
              autoComplete="email"
              required
              aria-invalid={!!state.fieldErrors?.email}
              aria-describedby={state.fieldErrors?.email ? 'email-error' : undefined}
            />
            {state.fieldErrors?.email && (
              <p
                id="email-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {state.fieldErrors.email}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Đang gửi yêu cầu…' : 'Gửi liên kết đặt lại mật khẩu'}
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
              <span>Quay lại trang chủ</span>
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
