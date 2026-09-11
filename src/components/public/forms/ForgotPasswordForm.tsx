'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react'
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
import { forgotPasswordAction } from '@/actions/student/forgot-password'
import {
  initialForgotPasswordState,
  type ForgotPasswordState,
} from '@/lib/constants/forgot-password-state'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/lib/validation/forgot-password-schema'

const SYSTEM_FAILURE: ForgotPasswordState = {
  status: 'error',
  message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
}

/**
 * Request a password-reset email. `react-hook-form` validates against the same
 * `forgotPasswordSchema` the action re-checks server-side, then calls the action directly
 * with a plain object — no `<form action>`, no `FormData`.
 *
 * The action rethrows anything it has no copy for, so the `.catch` here is the last place a
 * system failure can reach the person instead of crashing the page.
 */
export function ForgotPasswordForm() {
  const [state, setState] = useState<ForgotPasswordState>(initialForgotPasswordState)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    const result = await forgotPasswordAction(values.email).catch(() => SYSTEM_FAILURE)
    setState(result)
  }

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
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {state.status === 'error' && state.message && (
            <Alert variant="destructive">
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
              type="email"
              placeholder="ten@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {errors.email.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Đang gửi yêu cầu…' : 'Gửi liên kết đặt lại mật khẩu'}
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
