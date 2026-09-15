'use client'

import Link from 'next/link'
import * as React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Alert, AlertDescription } from '@/components/public/ui/alert'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { loginAction } from '@/actions/student/login'
import { initialLoginState, type LoginState } from '@/lib/constants/login-state'
import { loginSchema, type LoginFormValues } from '@/lib/validation/login-schema'

/**
 * Sign-in form for the `/dang-nhap` page. `react-hook-form` owns the fields and every
 * field-level message, validating against the same `loginSchema` the action re-checks
 * server-side. The action is called directly with a plain object, so this form needs
 * JavaScript — the `<form action>` progressive-enhancement path is gone.
 *
 * The split is worth stating: `errors` is per-field and always client-side; `state` is
 * the action's answer and only ever a banner or a navigation. Nothing merges them.
 *
 * Any `redirectTo` the action returns — a success target or the "verify first" bounce
 * — is followed with a full-document navigation, not `router.push`, so the fresh
 * `coursely-access` / `pending_email` cookie is read server-side at the destination
 * and `/admin` (a separate route tree) re-renders.
 */
const SYSTEM_FAILURE: LoginState = {
  status: 'error',
  message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
}

export const LoginForm: React.FC = () => {
  const [state, setState] = useState<LoginState>(initialLoginState)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    const result = await loginAction({
      ...values,
      callbackUrl: new URLSearchParams(window.location.search).get('callbackUrl'),
    }).catch(() => SYSTEM_FAILURE)

    setState(result)
    if (result.redirectTo) window.location.assign(result.redirectTo)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p
            id="login-email-error"
            role="alert"
            className="text-destructive-foreground text-xs font-medium"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Mật khẩu</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p
            id="login-password-error"
            role="alert"
            className="text-destructive-foreground text-xs font-medium"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end">
        <Link href="/quen-mat-khau" className="text-xs text-link hover:underline font-medium">
          Quên mật khẩu?
        </Link>
      </div>

      {state.status === 'error' && state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  )
}
