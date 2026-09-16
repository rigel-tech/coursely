'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { FormField } from '@/components/public/forms/field'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { registerAction } from '@/actions/student/register'
import { startGoogleAuthAction } from '@/actions/student/google-auth'
import { initialRegisterState, type RegisterState } from '@/lib/constants/register-state'
import { GOOGLE_AUTH_ERROR_MESSAGES } from '@/lib/constants/google-auth-errors'
import { registerSchema, type RegisterValues } from '@/lib/validation/register-schema'

const SYSTEM_FAILURE: RegisterState = {
  status: 'error',
  message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
}

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<RegisterState>(initialRegisterState)
  const [isGooglePending, startGoogleTransition] = useTransition()

  const googleErrorKey = searchParams?.get('error')
  const displayErrorMessage =
    (state.status === 'error' && state.message && !state.field ? state.message : null) ||
    (googleErrorKey ? GOOGLE_AUTH_ERROR_MESSAGES[googleErrorKey] : null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterValues) => {
    const result = await registerAction(values).catch(() => SYSTEM_FAILURE)

    setState(result)
    if (result.status === 'success') router.push('/xac-thuc-otp')
    if (result.status === 'error' && result.field === 'email' && result.message) {
      setError('email', { type: 'server', message: result.message })
    }
  }

  const handleGoogleAuth = () => {
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callbackUrl')
    startGoogleTransition(async () => {
      await startGoogleAuthAction(callbackUrl)
    })
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      {displayErrorMessage ? (
        <p
          className="border-error-foreground bg-error text-error-foreground rounded-md border px-3 py-2 text-sm font-medium"
          role="alert"
        >
          {displayErrorMessage}
        </p>
      ) : null}

      <FormField error={errors.fullName?.message} htmlFor="register-name" label="Họ và tên">
        <Input
          aria-invalid={Boolean(errors.fullName)}
          autoComplete="name"
          id="register-name"
          {...register('fullName')}
        />
      </FormField>

      <FormField error={errors.email?.message} htmlFor="register-email" label="Email">
        <Input
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="register-email"
          type="email"
          {...register('email')}
        />
      </FormField>

      <FormField
        error={errors.password?.message}
        hint="Ít nhất 8 ký tự, gồm cả chữ và số"
        htmlFor="register-password"
        label="Mật khẩu"
      >
        <Input
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          id="register-password"
          type="password"
          {...register('password')}
        />
      </FormField>

      <FormField
        error={errors.confirmPassword?.message}
        htmlFor="register-confirm"
        label="Nhập lại mật khẩu"
      >
        <Input
          aria-invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
          id="register-confirm"
          type="password"
          {...register('confirmPassword')}
        />
      </FormField>

      <Button disabled={isSubmitting || isGooglePending} type="submit" className="w-full">
        {isSubmitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </Button>

      <div className="relative my-2 flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Hoặc
        </span>
        <div className="w-full border-t border-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isSubmitting || isGooglePending}
        onClick={handleGoogleAuth}
        className="w-full flex items-center justify-center gap-2.5"
      >
        {isGooglePending ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Đang chuyển sang Google…</span>
          </>
        ) : (
          <>
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                className="fill-primary"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                className="fill-success-foreground"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                className="fill-brand-accent"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                className="fill-destructive-foreground"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </>
        )}
      </Button>
    </form>
  )
}
