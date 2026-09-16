'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Alert, AlertDescription } from '@/components/public/ui/alert'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { loginAction } from '@/actions/student/login'
import { startGoogleAuthAction } from '@/actions/student/google-auth'
import { initialLoginState, type LoginState } from '@/lib/constants/login-state'
import { loginSchema, type LoginFormValues } from '@/lib/validation/login-schema'
import { GOOGLE_AUTH_ERROR_MESSAGES } from '@/lib/constants/google-auth-errors'
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
  const searchParams = useSearchParams()
  const [state, setState] = useState<LoginState>(initialLoginState)
  const [isGooglePending, startGoogleTransition] = useTransition()

  const googleErrorKey = searchParams?.get('error')
  const displayErrorMessage =
    (state.status === 'error' && state.message ? state.message : null) ||
    (googleErrorKey ? GOOGLE_AUTH_ERROR_MESSAGES[googleErrorKey] : null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    // `route-guard` bounces a blocked visitor to `/dang-nhap?callbackUrl=<path>`. Fold
    // it into the submission so a successful login returns there; the server
    // re-validates it with `safeCallbackUrl`, so a tampered value is harmless.
    //
    // The action rethrows anything it has no copy for, so this is the last place a
    // system failure can still reach the person instead of crashing the page.
    const result = await loginAction({
      ...values,
      callbackUrl: new URLSearchParams(window.location.search).get('callbackUrl'),
    }).catch(() => SYSTEM_FAILURE)

    setState(result)
    if (result.redirectTo) window.location.replace(result.redirectTo)
  }

  const handleGoogleAuth = () => {
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callbackUrl')
    startGoogleTransition(async () => {
      await startGoogleAuthAction(callbackUrl)
    })
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
      {displayErrorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{displayErrorMessage}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || isGooglePending}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
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
