'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Alert, AlertDescription } from '@/components/public/ui/alert'
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
import { resetPasswordAction } from '@/actions/student/reset-password'
import {
  initialResetPasswordState,
  type ResetPasswordState,
} from '@/lib/constants/reset-password-state'
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from '@/lib/validation/reset-password-schema'

interface ResetPasswordFormProps {
  token?: string
}

const SYSTEM_FAILURE: ResetPasswordState = {
  status: 'error',
  message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
}

/**
 * Set a new password from the link in the forgot-password email. `react-hook-form`
 * validates the two fields it owns against `resetPasswordFormSchema`, then calls
 * `resetPasswordAction` with those plus the `token` prop — the token is not a field the
 * person types, so it never goes through the form's own validation.
 *
 * The action rethrows anything it has no copy for, so the `.catch` here is the last place
 * a system failure can reach the person instead of crashing the page.
 */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, setState] = useState<ResetPasswordState>(initialResetPasswordState)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

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

  const onSubmit = async (values: ResetPasswordFormValues) => {
    const result = await resetPasswordAction({ token, ...values }).catch(() => SYSTEM_FAILURE)
    setState(result)
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
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {state.status === 'error' && state.message && (
            <Alert variant="destructive">
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
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {errors.password.message}
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
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p
                id="confirmPassword-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Đang xử lý…' : 'Cập nhật mật khẩu'}
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
