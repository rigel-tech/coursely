'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react'
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
import { resetPasswordAction, type ResetPasswordFormState } from '@/actions/auth/reset-password'

interface ResetPasswordFormProps {
  token?: string
}

const initialState: ResetPasswordFormState = {
  status: 'idle',
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

  if (!token) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/20 text-destructive-foreground">
            <AlertCircle className="size-6 text-destructive-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Liên kết không hợp lệ
          </CardTitle>
          <CardDescription className="text-sm mt-2 text-muted-foreground">
            Liên kết đặt lại mật khẩu bị thiếu mã xác thực hoặc không hợp lệ. Vui lòng gửi lại yêu
            cầu mới.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 pt-4">
          <Button asChild className="w-full">
            <Link href="/quen-mat-khau">Yêu cầu liên kết mới</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
              <span>Về trang chủ</span>
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (state.status === 'success') {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success/20 text-success-foreground">
            <CheckCircle2 className="size-6 text-success-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Đặt lại mật khẩu thành công!
          </CardTitle>
          <CardDescription className="text-sm mt-2 text-muted-foreground">
            {state.message}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 pt-4">
          <Button asChild className="w-full">
            <Link href="/">Đăng nhập ngay</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">Tạo mật khẩu mới</CardTitle>
        <CardDescription className="text-sm mt-1">
          Nhập mật khẩu mới cho tài khoản của bạn (tối thiểu 8 ký tự, gồm cả chữ và số).
        </CardDescription>
      </CardHeader>
      <form action={formAction} noValidate>
        <input type="hidden" name="token" value={token} />

        <CardContent className="space-y-4">
          {state.status === 'error' && state.message && !state.fieldErrors && (
            <Alert variant="destructive">
              <AlertCircle className="size-4 shrink-0" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-foreground font-medium flex items-center gap-1.5"
            >
              <Lock className="size-4 text-muted-foreground" />
              Mật khẩu mới
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state.fieldErrors?.password}
              aria-describedby={state.fieldErrors?.password ? 'password-error' : undefined}
            />
            {state.fieldErrors?.password && (
              <p
                id="password-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {state.fieldErrors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-foreground font-medium flex items-center gap-1.5"
            >
              <Lock className="size-4 text-muted-foreground" />
              Xác nhận mật khẩu mới
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state.fieldErrors?.confirmPassword}
              aria-describedby={
                state.fieldErrors?.confirmPassword ? 'confirmPassword-error' : undefined
              }
            />
            {state.fieldErrors?.confirmPassword && (
              <p
                id="confirmPassword-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {state.fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Đang xử lý…' : 'Cập nhật mật khẩu'}
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
              <span>Hủy và về trang chủ</span>
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
